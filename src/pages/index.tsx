import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { SignInButton, useUser } from "@clerk/nextjs";
import toast from 'react-hot-toast';

import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";

import { api } from "~/utils/api";
import type { RouterOutputs } from "~/utils/api";
import { LoadingSpinner } from "~/components/Loading";
import { useState } from "react";
import Link from "next/link";
import { PageLayout } from "~/components/Layout";

dayjs.extend(relativeTime);

const CreatePostWizard = () => {
  const { user } = useUser();

  const [input, setInput] = useState("");

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      setInput("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0])
      } else {
        toast.error(`The message couldn't be post`)
      }
    }
  });

  if (!user) return null;
  return <div className='flex gap-4 w-full'>
    <Image
      src={user.profileImageUrl}
      alt="Profile Image"
      className="w-16 h-16 rounded-full"
      width={64}
      height={64}
    />
    <input
      placeholder="Type only emojis ;)"
      className="bg-transparent grow outline-none"
      type="text"
      value={input}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (input !== "") {
            mutate({ content: input })
          }
        }
      }}
      onChange={(e) => setInput(e.target.value)}
      disabled={isPosting}
    />

    {input !== "" && !isPosting && (<button
      onClick={() => mutate({ content: input })}
      disabled={isPosting}
    >Post</button>)}

    {isPosting && <div className="flex items-center justify-center"><LoadingSpinner /></div>}
  </div>
}


type PostWithUser = RouterOutputs["posts"]["getAll"][number];

const PostView = (props: PostWithUser) => {
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

const Feed = () => {
  const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

  if (postsLoading) return (<div className="flex justify-center items-center h-screen">
    <LoadingSpinner />
  </div>);

  if (!data) return <div>Something went wrong!</div>

  return <div className="flex flex-col">
    {
      data.map((dataPost) =>
        (<PostView key={dataPost.post.id} {...dataPost} />)
      )
    }
  </div>
}

const Home: NextPage = () => {


  const { isLoaded: userLoaded, isSignedIn } = useUser();

  if (!userLoaded) return <div />;

  return (
    <>
      <PageLayout>
        <div className="border flex justify-center p-4">{
          !isSignedIn
            ? <SignInButton />
            : <CreatePostWizard />
        }</div>
        <Feed />
      </PageLayout>
    </>
  );
};

export default Home;
