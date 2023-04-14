import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Post } from "@prisma/client";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { filterUserForClient } from "~/server/helpers/filterUsersForClient";
import { prisma } from "~/server/db";

const errorMessage = "Only emojis are allowed 😊";

type userKarma = {
    alreadyVoted: boolean,
    isPositive: boolean
}

const calculateKarma = (postKarma: simpleKarmaType[]) => {
    return postKarma.length > 0
        ? postKarma.reduce((acc, curr) => {
            return acc + (curr.isPositive ? 1 : -1)
        }, 0)
        : 0
}

const addAuthorAndKarmaToDataPost = async (posts: Post[], userId: string | null) => {

    const users = (await clerkClient.users.getUserList({
        userId: posts.map(post => post.authorId),
        limit: 100,
    })).map(filterUserForClient);

    const postsWithAuthorAndKarma = await Promise.all(posts.map(async (post) => {
        const author = users.find((user) => user.id === post.authorId);
        const karmaPost = await prisma.postKarma.findMany({
            where: {
                postId: post.id
            },
            select: {
                isPositive: true
            }
        });
        let userKarma: userKarma;

        if (userId) {
            const userPostKarma = await prisma.postKarma.findMany({
                where: {
                    postId: post.id,
                    userId
                },
                select: {
                    isPositive: true
                }
            });

            userKarma = !!userPostKarma && userPostKarma[0]?.isPositive !== undefined
                ? { alreadyVoted: true, isPositive: userPostKarma[0].isPositive }
                : { alreadyVoted: false, isPositive: false };
        } else {
            userKarma = {
                alreadyVoted: false,
                isPositive: false
            }
        }

        const totalKarma = calculateKarma(karmaPost);

        if (!author || !author.username) throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Author for post not found'
        });

        return {
            post,
            author: {
                ...author,
                username: author.username
            },
            userKarma,
            totalKarma
        }
    }));

    return postsWithAuthorAndKarma;
}

type simpleKarmaType = {
    isPositive: boolean;
}

// Create a new ratelimiter, that allows 3 requests per 1 minute
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, "1 m"),
    analytics: true,

    prefix: "@upstash/ratelimit",
});

export const postsRouter = createTRPCRouter({
    getById: publicProcedure.input(z.object({
        id: z.string()
    })).query(async ({ ctx, input }) => {
        const post = await ctx.prisma.post.findUnique({
            where: {
                id: input.id,
            }
        });

        const userId = ctx.userId;

        if (!post) throw new TRPCError({ code: "NOT_FOUND" });


        return (await addAuthorAndKarmaToDataPost([post], userId))[0]
    }),
    getAll: publicProcedure.query(async ({ ctx }) => {
        const posts = await ctx.prisma.post.findMany({
            take: 100,
            orderBy: [{ createdAt: "desc" }]
        });
        const userId = ctx.userId;

        return (await addAuthorAndKarmaToDataPost(posts, userId));
    }),
    getPostsByUserId: publicProcedure.input(z.object({
        userId: z.string()
    })).query(async ({ ctx, input }) => {

        const posts = await ctx.prisma.post.findMany({
            where: {
                authorId: input.userId
            },
            take: 100,
            orderBy: [{ createdAt: "desc" }],
        });
        const userId = ctx.userId;

        return await addAuthorAndKarmaToDataPost(posts, userId)
    }),
    create: privateProcedure
        .input(
            z.object({
                content: z.string().regex(/\D+/g, errorMessage).emoji(errorMessage).min(1).max(255),
            })
        )
        .mutation(async ({ ctx, input }) => {

            const authorId = ctx.userId;
            const content = input.content;

            const { success } = await ratelimit.limit(authorId);

            if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

            const post = await ctx.prisma.post.create({
                data: {
                    authorId,
                    content
                }
            });

            return post;
        }),
    setKarma: privateProcedure
        .input(
            z.object({
                postId: z.string(),
                isPositive: z.boolean(),
                oldKarma: z.object({
                    alreadyVoted: z.boolean(),
                    isPositive: z.boolean()
                })
            })
        ).mutation(async ({ ctx, input }) => {

            const { postId, isPositive, oldKarma } = input;
            const { userId } = ctx;

            if (oldKarma.alreadyVoted) {
                if (oldKarma.isPositive === isPositive) {

                    await ctx.prisma.postKarma.deleteMany({
                        where: {
                            postId,
                            userId
                        }
                    });
                    return {
                        alreadyVoted: false,
                        isPositive
                    }

                } else {
                    await ctx.prisma.postKarma.updateMany({
                        where: {
                            postId,
                            userId
                        },
                        data: {
                            isPositive
                        }
                    });
                    return {
                        alreadyVoted: true,
                        isPositive
                    }
                }
            } else {
                await ctx.prisma.postKarma.create({
                    data: {
                        userId,
                        postId,
                        isPositive
                    }
                })
                return {
                    alreadyVoted: true,
                    isPositive
                }
            }

        })
});