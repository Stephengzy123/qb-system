import { getAppUser } from "@/lib/app-user";
import { getImport } from "@/lib/question-imports";
export async function GET(_request:Request,{params}:{params:Promise<{importId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=="active" || user.role==="student") return Response.json({error:"Staff access required."},{status:403});
  const job=await getImport(user,(await params).importId);
  return job?Response.json(job):Response.json({error:"Import not found."},{status:404});
}
