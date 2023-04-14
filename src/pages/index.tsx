import { useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import toast from 'react-hot-toast';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import { type NextPage } from "next";
import Image from "next/image";

import { api } from "~/utils/api";
import { LoadingSpinner } from "~/components/Loading";
import { PageLayout } from "~/components/Layout";
import { PostView } from "~/components/PostView";
import Popup from "reactjs-popup";

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
    },
  });

  type propsEmojiKeyboard = {
    native: string
  }

  const handleEmojiKeyboard = ({ native }: propsEmojiKeyboard) => {
    setInput(prevState => {
      return prevState + native
    });
  }

  if (!user) return null;
  return <div className='flex gap-4 w-full relative'>
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
    <Popup arrow={false} position='bottom left' offsetX={-324} trigger={<button>⌨️</button>}>
      <Picker className='bottom-0 left-0 absolute' data={data} onEmojiSelect={handleEmojiKeyboard} />
    </Popup>

    {input !== "" && !isPosting && (<button
      onClick={() => mutate({ content: input })}
      disabled={isPosting}
    >Post</button>)}

    {isPosting && <div className="flex items-center justify-center"><LoadingSpinner /></div>}
  </div>
}

const Feed = () => {
  const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

  if (postsLoading) return (<div className="flex justify-center items-center h-screen">
    <LoadingSpinner  />
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

  // To fetch the posts as soon as posible
  api.posts.getAll.useQuery();

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
