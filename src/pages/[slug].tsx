import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { LoadingSpinner } from "~/components/Loading";
import { api } from "~/utils/api";
import Image from 'next/image';
import { PageLayout } from "~/components/Layout";
import { PostView } from "~/components/PostView";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";

const ProfileFeed = (props: {userId: string}) => {
  const { data, isLoading } = api.posts.getPostsByUserId.useQuery({userId: props.userId})

  if (isLoading) return <LoadingSpinner />;

  if (!data || data.length === 0) return <div className="p-2 flex justify-center">User has not posts yet!</div>

  return <div className="flex flex-col">
    {
      data.map((dataPost) =>
        (<PostView key={dataPost.post.id} {...dataPost}/>)
      )
    }
  </div>
}

const ProfilePage: NextPage<{username : string}> = ({username}) => {

  const { data, isLoading } = api.profile.getUserByUsername.useQuery({
    username
  });

  if (isLoading) return <LoadingSpinner />

  if(!data) return <div>404 USER NOT FOUND</div>


  return (
    <>
      <Head>
        <title>{data.username}</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="relative h-24 border-b bg-slate-600">
          <Image
            src={data.profileImage}
            alt={`${data.username ?? ''}'s profile picture`}
            width={128}
            height={128}
            className="-mb-[64px] absolute bottom-0 left-0 ml-6 rounded-full border-2"
          />
        </div>
        <div className="h-[48px]"></div>
        <div className="p-4 text-2xl font-bold">{`@${data.username ?? ""}`}</div>
        <div className="w-full border-b"></div>
        <ProfileFeed userId={data.id} />
      </PageLayout>
    </>
  );
};



export const getStaticProps: GetStaticProps = async (context) => {
  
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("No slug");


  const username = slug.replace("@", "");

  await ssg.profile.getUserByUsername.prefetch({ username });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username
    },
  };
};

export const getStaticPaths = () => {

  return {
    paths: [],
    fallback: "blocking"
  }
}

export default ProfilePage;