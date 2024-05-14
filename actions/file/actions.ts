// "use server";
// import { createClient } from "@/utils/supabase/server";

// export async function uploadToStorage(file: any) {
//   try {
//     const supabase = createClient();
//     // const { auth } = supabase;

//     // const { data: user } = await auth.getUser();
//     // console.log("User:", user); // Log user data

//     const { data, error } = await supabase.storage
//       .from("avatars")
//       .upload("public/avatar", file, {
//         cacheControl: "3600",
//         upsert: false,
//       });

//     if (error) {
//       console.error("Error uploading image:", error.message);
//       return { success: false, error: error };
//     }

//     console.log("Uploaded data:", data); // Log uploaded data
//     return { success: true, data: data };
//   } catch (error: any) {
//     console.error("Error:", error); // Log any errors
//     return { success: false, error: error };
//   }
// }
