import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import Link from "next/link";
import { api, type RouterOutputs } from "~/utils/api";
import Image from "next/image";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "./Loading";

type PostWithUser = RouterOutputs["posts"]["getAll"][number];

dayjs.extend(relativeTime);

export const PostView = (props: PostWithUser) => {
  const { user } = useUser();
  const { mutate, isLoading: isVoting } = api.posts.setKarma.useMutation({
    onSuccess: (newKarma) => {
      
      let sum : number;
      if (newKarma.alreadyVoted && currentKarma.alreadyVoted){
        sum = newKarma.isPositive ? 2 : -2
      }
      else if (newKarma.alreadyVoted){
        sum = newKarma.isPositive ? 1 : -1
      } else {
        sum = newKarma.isPositive ? -1 : 1
      }

      setCurrentKarma(newKarma);
      setKarma(prevState => prevState + sum)
    },
    onError: () => {
      toast.error(`Oops, couldn't vote.`)
    }
  });

  const { post, author, totalKarma, userKarma } = props;
  const [karma, setKarma] = useState(totalKarma);
  const [currentKarma, setCurrentKarma ] = useState(userKarma);

  const handleVote = (isPositiveVote: boolean) => {
    
    if (!user) {
      toast.error('You need to be logged in to vote')
      return null
    }

    const setKarmaMutation = {
      postId: post.id,
      isPositive: isPositiveVote,
      oldKarma: currentKarma
    };

    mutate(setKarmaMutation);
    
  }
 
  return (
    <div className='p-4 border-b gap-3 flex' key={post.id}>
      <Image
        src={author.profileImage}
        alt="Profile Image"
        className="w-16 h-16 rounded-full"
        width={64}
        height={64}
      />
      <div className="flex flex-col w-full">
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
        <div className="flex gap-3 self-end">
          {
            isVoting
            ? <LoadingSpinner size={7} />
            : 
            <>
              <button onClick={() => handleVote(true)} className={currentKarma.alreadyVoted && currentKarma.isPositive && `bg-green-500` || ''}>⬆️</button>
                <span>{karma}</span>
              <button onClick={() => handleVote(false)} className={currentKarma.alreadyVoted && !currentKarma.isPositive && `bg-red-500` || ''}>⬇️</button>
            </>
          }
        </div>
      </div>
    </div>
  )
}