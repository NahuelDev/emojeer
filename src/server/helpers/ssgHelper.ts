import { createProxySSGHelpers } from "@trpc/react-query/ssg"
import { appRouter } from "../api/root"
import { prisma } from "../db";
import superjson from 'superjson';

export const generateSSGHelper = () => createProxySSGHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson
});
