import { z } from "zod";

const loginSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export default loginSchema;
