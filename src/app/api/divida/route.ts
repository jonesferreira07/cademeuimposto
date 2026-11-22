import { NextRequest, NextResponse } from "next/server";
import { publicDebt } from "@/lib/public-debt";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration=60;
export async function GET(request:NextRequest){
  try{parsePeriod(request.nextUrl.searchParams.get("year"));return NextResponse.json(await publicDebt());}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Dívida pública indisponível."},{status:error instanceof PeriodError?400:502});}
}
