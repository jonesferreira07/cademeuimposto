import {NextResponse} from "next/server";
import {federalDestinations} from "@/lib/federal-destinations";
export const maxDuration=45;
export async function GET(){
 try{return NextResponse.json(await federalDestinations());}
 catch{return NextResponse.json({error:"Não foi possível confirmar os gastos federais por área. Nenhum valor foi estimado."},{status:502});}
}
