import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import Link from "next/link";
import type { RouterOutputs } from "~/utils/api";
import Image from "next/image";

type PostWithUser = RouterOutputs["posts"]["getAll"][number];

dayjs.extend(relativeTime);

export const PostView = (props: PostWithUser) => {
  const { post, author } = props;
  return (
    <div className='p-4 border-b gap-3 flex' key={post.id}>
      <Image
        src={author.profileImage}
        alt="Profile Image"
        className="w-16 h-16 rounded-full"
        width={64}
        height={64}
      />
      <div className="flex flex-col">
        <div className="flex gap-1 text-slate-300">
          <Link href={`/@${author.username}`}>
            <span>{`@${author.username}`}</span>
          </Link>
          <Link href={`/post/${post.id}`}>
            <span className="font-thin">
              {`- ${dayjs(post.createdAt).fromNow()} `}
            </span>
          </Link>
        </div>
        <span className="text-2xl">{post.content}</span>
      </div>
    </div>
  )
}