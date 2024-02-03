import { verifyToken } from "@/server/auth";
import { cookies } from "next/headers";
import { createUploadthing, type FileRouter } from "uploadthing/next";
 
const f = createUploadthing();
 
const auth = (req: Request) => {
  const rawToken = cookies().get('token')?.value;
  console.log(rawToken);
  if (!rawToken) return null;
  try {
    const token = verifyToken(rawToken);
    return token;
  } catch (_) {
    return null;
  }
};

const useMiddleware = async ({ req }: any) => {
  // This code runs on your server before upload
  const user = auth(req);

  // If you throw, the user will not be able to upload
  if (!user) throw new Error('Unauthorized');

  // Whatever is returned here is accessible in onUploadComplete as `metadata`
  //@ts-ignore
  console.log(user.uuid);
  //@ts-ignore
  return { userId: user.uuid };
};

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "16MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const user = await auth(req);
 
      // If you throw, the user will not be able to upload
      if (!user) throw new Error("Unauthorized");
 
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.uuid };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
 
      console.log("file url", file.url);
 
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;