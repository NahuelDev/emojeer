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

const calculateKarma = (postKarma: simpleKarmaType[]) => {
    return postKarma.length > 0
        ? postKarma.reduce((acc, curr) => {
            return acc + (curr.isPositive ? 1 : -1)
        }, 0)
        : 0
}

const addAuthorAndKarmaToDataPost = async (posts: Post[]) => {

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

        if (!post) throw new TRPCError({ code: "NOT_FOUND" });

        return (await addAuthorAndKarmaToDataPost([post]))[0]
    }),
    getAll: publicProcedure.query(async ({ ctx }) => {
        const posts = await ctx.prisma.post.findMany({
            take: 100,
            orderBy: [{ createdAt: "desc" }]
        });

        return (await addAuthorAndKarmaToDataPost(posts));
    }),
    getPostsByUserId: publicProcedure.input(z.object({
        userId: z.string()
    })).query(({ ctx, input }) => ctx.prisma.post.findMany({
        where: {
            authorId: input.userId
        },
        take: 100,
        orderBy: [{ createdAt: "desc" }],
    }).then(addAuthorAndKarmaToDataPost)),
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
                isPositiveVote: z.boolean(),
                oldKarma: z.object({
                    alreadyVoted: z.boolean(),
                    isKarmaPositive: z.boolean()
                })
            })
        ).mutation(async ({ ctx, input }) => {

            const { postId, isPositiveVote, oldKarma } = input;
            const { userId } = ctx;

            if (oldKarma.alreadyVoted) {
                if (oldKarma.isKarmaPositive === isPositiveVote) {

                    await ctx.prisma.postKarma.deleteMany({
                        where: {
                            postId,
                            userId
                        }
                    });

                } else {
                    isPositiveVote ?
                        await ctx.prisma.postKarma.updateMany({
                            where: {
                                postId,
                                userId
                            },
                            data: {
                                isPositive: isPositiveVote
                            }
                        })
                        :
                        await ctx.prisma.postKarma.updateMany({
                            where: {
                                postId,
                                userId
                            },
                            data: {
                                isPositive: isPositiveVote
                            }
                        });
                }
            } else {
                isPositiveVote ?
                    await ctx.prisma.postKarma.create({
                        data: {
                            userId,
                            postId,
                            isPositive: isPositiveVote
                        }
                    })
                    :
                    await ctx.prisma.postKarma.create({
                        data: {
                            userId,
                            postId,
                            isPositive: isPositiveVote
                        }
                    })
            }
        })
});