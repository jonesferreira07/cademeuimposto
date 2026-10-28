import {NextRequest,NextResponse}from"next/server";
import{federalPowers}from"@/lib/federal-powers";
import{parsePeriod,PeriodError}from"@/lib/finance";
export const maxDuration=45;
export async function GET(request:NextRequest){try{parsePeriod(request.nextUrl.searchParams.get("year"));return NextResponse.json(await federalPowers());}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Dados dos Poderes indisponíveis."},{status:error instanceof PeriodError?400:502});}}
