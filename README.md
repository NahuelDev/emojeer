# Emojeer

[Emojeer](https://emojer.nahuelclotet.com.ar/) is a web application where users can log in using their Google or Github account and publish posts that consist only of emojis. Users can also view profiles and explore other user's posts.

## Technologies

This project uses the following technologies:

- **Next.js**: a React-based framework for building server-side rendered web applications
- **Prisma**: an ORM (Object-Relational Mapping) tool used to interact with the database
- **TRPC**: a TypeScript-based RPC (Remote Procedure Call) framework used for server-client communication
- **Tailwind**: a utility-first CSS framework used for styling the application
- **Clerk**: a user authentication and identity management service
- **Upstash**: a cloud-based Redis database service
- **Planetscale**: a cloud-based database service built on Vitess

## Getting started

To run local this project, follow these steps:

1. Clone the repository: `git clone https://github.com/NahuelDev/emojeer.git`
2. Install dependencies: `cd emojeer && npm install`
3. Create a `.env.local` file with the environment variables listed in `.env.example`:
4. Fill in the values for each variable in the `.env.local` file
5. Start the development server: `npm run dev`
6. Visit `http://localhost:3000` to view the application
