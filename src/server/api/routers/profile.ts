import { type User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { filterUserForClient } from "~/server/helpers/filterUsersForClient";


// Create a new ratelimiter, that allows 3 requests per 1 minute

export const profileRouter = createTRPCRouter({

    getUserByUsername: publicProcedure
        .input(z.object({ username: z.string() }))
        .query(async ({ ctx, input }) => {
            const [user] = await clerkClient.users.getUserList({
                username: [input.username]
            });

            if (!user) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "User not found"
                });
            }

            return filterUserForClient(user);
        })
});