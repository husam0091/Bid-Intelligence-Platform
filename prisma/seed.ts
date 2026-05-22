import { PrismaClient, Outcome, ProjectType, ProjectSize, TenderType, ClientCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { computeDecision } from '../lib/decision'

const prisma = new PrismaClient()

const RAW_BIDS = [
  { sr:1,  name:"Al Rimal",    location:"Riyadh",          type:"BUILDING",        size:"MEDIUM_SMALL", duration:"6 Months", tenderType:"NEGOTIATED", clientCategory:"GOV",     estValue:1000000,  contractValue:800000,  date:"2022-01-01", outcome:"REJECTED", relStrength:2,budgetKnown:5,competitors:2,limitedInv:2,similarExp:2,noPriceBreakers:2,techAdv:2,withinExpertise:2,lowChanges:2,goodLocation:5,teamAvail:2,equipAvail:4,cashFlow:0,currWorkload:0,noImpactRunning:1,ld:2,apg:2,perfBond:0,retention:0,newSystem:2,complexMEP:0,specialAuth:0,clientRep:5,clearDwgs:1,advPayment:3,payments:1,finDuration:2 },
  { sr:2,  name:"Al Qasim",    location:"Jeddah",           type:"INDUSTRIAL",      size:"LARGE",        duration:"1 Year",   tenderType:"LIMITED",    clientCategory:"GOV",     estValue:2000000,  contractValue:1800000, date:"2022-01-02", outcome:"WON",      relStrength:5,budgetKnown:5,competitors:5,limitedInv:5,similarExp:5,noPriceBreakers:5,techAdv:5,withinExpertise:5,lowChanges:5,goodLocation:5,teamAvail:5,equipAvail:5,cashFlow:5,currWorkload:5,noImpactRunning:5,ld:5,apg:5,perfBond:5,retention:5,newSystem:5,complexMEP:5,specialAuth:5,clientRep:5,clearDwgs:5,advPayment:5,payments:5,finDuration:5 },
  { sr:3,  name:"Riyadh",      location:"Mecca (Makkah)",   type:"INFRASTRUCTURE",  size:"MEGA",         duration:"2 Year",   tenderType:"OPEN",       clientCategory:"GOV",     estValue:3000000,  contractValue:2800000, date:"2022-01-07", outcome:"REJECTED", relStrength:4,budgetKnown:1,competitors:3,limitedInv:0,similarExp:1,noPriceBreakers:4,techAdv:1,withinExpertise:3,lowChanges:0,goodLocation:1,teamAvail:4,equipAvail:1,cashFlow:3,currWorkload:0,noImpactRunning:1,ld:4,apg:1,perfBond:3,retention:0,newSystem:1,complexMEP:3,specialAuth:0,clientRep:5,clearDwgs:3,advPayment:4,payments:1,finDuration:2 },
  { sr:4,  name:"Dammam",      location:"Medina (Madinah)", type:"BUILDING",        size:"MEGA",         duration:"3 Year",   tenderType:"OPEN",       clientCategory:"PRIVATE", estValue:3000000,  contractValue:2800000, date:"2023-01-22", outcome:"REJECTED", relStrength:2,budgetKnown:3,competitors:1,limitedInv:0,similarExp:3,noPriceBreakers:2,techAdv:3,withinExpertise:1,lowChanges:0,goodLocation:3,teamAvail:2,equipAvail:3,cashFlow:1,currWorkload:0,noImpactRunning:3,ld:2,apg:3,perfBond:1,retention:0,newSystem:3,complexMEP:1,specialAuth:0,clientRep:2,clearDwgs:5,advPayment:5,payments:3,finDuration:0 },
  { sr:5,  name:"Kharj",       location:"Dammam",           type:"BUILDING",        size:"MEGA",         duration:"4 Year",   tenderType:"LIMITED",    clientCategory:"PRIVATE", estValue:3000000,  contractValue:2800000, date:"2023-01-18", outcome:"PENDING",  relStrength:5,budgetKnown:4,competitors:4,limitedInv:5,similarExp:4,noPriceBreakers:5,techAdv:4,withinExpertise:4,lowChanges:5,goodLocation:4,teamAvail:5,equipAvail:4,cashFlow:4,currWorkload:5,noImpactRunning:4,ld:5,apg:4,perfBond:4,retention:5,newSystem:4,complexMEP:4,specialAuth:5,clientRep:5,clearDwgs:5,advPayment:5,payments:2,finDuration:4 },
  { sr:6,  name:"Umluj",       location:"Al-Khobar",        type:"BUILDING",        size:"MEGA",         duration:"5 Year",   tenderType:"NEGOTIATED", clientCategory:"GOV",     estValue:3000000,  contractValue:2800000, date:"2023-01-31", outcome:"WON",      relStrength:2,budgetKnown:3,competitors:0,limitedInv:3,similarExp:1,noPriceBreakers:2,techAdv:3,withinExpertise:0,lowChanges:3,goodLocation:1,teamAvail:2,equipAvail:3,cashFlow:0,currWorkload:3,noImpactRunning:1,ld:2,apg:3,perfBond:0,retention:3,newSystem:3,complexMEP:0,specialAuth:3,clientRep:3,clearDwgs:5,advPayment:5,payments:5,finDuration:5 },
  { sr:7,  name:"Tabuk",       location:"Dhahran",          type:"INDUSTRIAL",      size:"MEGA",         duration:"5 Year",   tenderType:"LIMITED",    clientCategory:"PRIVATE", estValue:3000000,  contractValue:2800000, date:"2024-02-02", outcome:"WON",      relStrength:2,budgetKnown:2,competitors:5,limitedInv:2,similarExp:3,noPriceBreakers:2,techAdv:2,withinExpertise:5,lowChanges:2,goodLocation:3,teamAvail:2,equipAvail:2,cashFlow:5,currWorkload:2,noImpactRunning:3,ld:2,apg:2,perfBond:5,retention:2,newSystem:2,complexMEP:5,specialAuth:2,clientRep:5,clearDwgs:2,advPayment:5,payments:4,finDuration:2 },
  { sr:8,  name:"Khobar",      location:"Tabuk",            type:"INDUSTRIAL",      size:"MEGA",         duration:"5 Year",   tenderType:"NEGOTIATED", clientCategory:"PRIVATE", estValue:6540000,  contractValue:6340000, date:"2024-02-06", outcome:"LOST",     relStrength:4,budgetKnown:4,competitors:1,limitedInv:0,similarExp:1,noPriceBreakers:4,techAdv:4,withinExpertise:1,lowChanges:0,goodLocation:1,teamAvail:4,equipAvail:4,cashFlow:1,currWorkload:0,noImpactRunning:1,ld:4,apg:4,perfBond:1,retention:0,newSystem:4,complexMEP:1,specialAuth:0,clientRep:5,clearDwgs:5,advPayment:1,payments:5,finDuration:2 },
  { sr:9,  name:"Dahran",      location:"Abha",             type:"INDUSTRIAL",      size:"MEDIUM_SMALL", duration:"5 Year",   tenderType:"OPEN",       clientCategory:"GOV",     estValue:800000,   contractValue:240000,  date:"2024-02-10", outcome:"PENDING",  relStrength:3,budgetKnown:3,competitors:5,limitedInv:4,similarExp:3,noPriceBreakers:3,techAdv:3,withinExpertise:5,lowChanges:4,goodLocation:3,teamAvail:3,equipAvail:3,cashFlow:5,currWorkload:4,noImpactRunning:3,ld:5,apg:5,perfBond:5,retention:4,newSystem:3,complexMEP:5,specialAuth:5,clientRep:5,clearDwgs:5,advPayment:5,payments:0,finDuration:5 },
  { sr:10, name:"Abha",        location:"Umluj",            type:"INDUSTRIAL",      size:"MEGA",         duration:"5 Year",   tenderType:"OPEN",       clientCategory:"SEMI",    estValue:6464000,  contractValue:6264000, date:"2024-02-22", outcome:"WON",      relStrength:3,budgetKnown:1,competitors:1,limitedInv:5,similarExp:4,noPriceBreakers:3,techAdv:1,withinExpertise:1,lowChanges:5,goodLocation:4,teamAvail:3,equipAvail:1,cashFlow:1,currWorkload:5,noImpactRunning:4,ld:3,apg:1,perfBond:1,retention:5,newSystem:1,complexMEP:1,specialAuth:1,clientRep:5,clearDwgs:5,advPayment:1,payments:4,finDuration:4 },
  { sr:11, name:"Hail",        location:"Ha'il",            type:"INDUSTRIAL",      size:"MEGA",         duration:"5 Year",   tenderType:"LIMITED",    clientCategory:"SEMI",    estValue:6540000,  contractValue:6340000, date:"2025-04-16", outcome:"PENDING",  relStrength:2,budgetKnown:2,competitors:4,limitedInv:1,similarExp:4,noPriceBreakers:2,techAdv:2,withinExpertise:4,lowChanges:1,goodLocation:4,teamAvail:2,equipAvail:2,cashFlow:4,currWorkload:1,noImpactRunning:4,ld:2,apg:2,perfBond:4,retention:5,newSystem:5,complexMEP:4,specialAuth:5,clientRep:3,clearDwgs:5,advPayment:5,payments:3,finDuration:5 },
  { sr:12, name:"Ahasa",       location:"Al-Ahsa (Hofuf)",  type:"BUILDING",        size:"MEDIUM_SMALL", duration:"5 Year",   tenderType:"OPEN",       clientCategory:"SEMI",    estValue:900000,   contractValue:677000,  date:"2025-03-02", outcome:"REJECTED", relStrength:0,budgetKnown:2,competitors:5,limitedInv:2,similarExp:0,noPriceBreakers:0,techAdv:0,withinExpertise:0,lowChanges:0,goodLocation:0,teamAvail:0,equipAvail:0,cashFlow:0,currWorkload:0,noImpactRunning:0,ld:0,apg:0,perfBond:0,retention:0,newSystem:0,complexMEP:0,specialAuth:0,clientRep:0,clearDwgs:5,advPayment:5,payments:4,finDuration:2 },
  { sr:13, name:"Qatif",       location:"Al-Qatif",         type:"BUILDING",        size:"MEDIUM_SMALL", duration:"5 Year",   tenderType:"OPEN",       clientCategory:"PRIVATE", estValue:1000000,  contractValue:200000,  date:"2025-10-08", outcome:"WON",      relStrength:4,budgetKnown:4,competitors:1,limitedInv:3,similarExp:1,noPriceBreakers:4,techAdv:4,withinExpertise:1,lowChanges:3,goodLocation:1,teamAvail:4,equipAvail:4,cashFlow:1,currWorkload:3,noImpactRunning:1,ld:4,apg:4,perfBond:1,retention:3,newSystem:4,complexMEP:1,specialAuth:3,clientRep:5,clearDwgs:2,advPayment:3,payments:4,finDuration:2 },
  { sr:14, name:"Yanbu",       location:"Yanbu",            type:"BUILDING",        size:"MEGA",         duration:"5 Year",   tenderType:"NEGOTIATED", clientCategory:"PRIVATE", estValue:3000000,  contractValue:2800000, date:"2025-11-12", outcome:"REJECTED", relStrength:2,budgetKnown:3,competitors:1,limitedInv:0,similarExp:3,noPriceBreakers:2,techAdv:3,withinExpertise:1,lowChanges:0,goodLocation:3,teamAvail:2,equipAvail:3,cashFlow:1,currWorkload:0,noImpactRunning:3,ld:2,apg:3,perfBond:1,retention:0,newSystem:3,complexMEP:1,specialAuth:0,clientRep:2,clearDwgs:5,advPayment:5,payments:3,finDuration:1 },
  { sr:15, name:"Najran",      location:"Najran",           type:"INFRASTRUCTURE",  size:"MEDIUM_SMALL", duration:"5 Year",   tenderType:"OPEN",       clientCategory:"SEMI",    estValue:660000,   contractValue:500000,  date:"2025-12-19", outcome:"WON",      relStrength:3,budgetKnown:3,competitors:4,limitedInv:1,similarExp:4,noPriceBreakers:3,techAdv:3,withinExpertise:4,lowChanges:1,goodLocation:4,teamAvail:3,equipAvail:3,cashFlow:4,currWorkload:1,noImpactRunning:4,ld:3,apg:3,perfBond:4,retention:1,newSystem:3,complexMEP:4,specialAuth:1,clientRep:5,clearDwgs:5,advPayment:5,payments:4,finDuration:4 },
  { sr:16, name:"Bahah",       location:"Al-Bahah",         type:"BUILDING",        size:"MEDIUM_SMALL", duration:"5 Year",   tenderType:"OPEN",       clientCategory:"PRIVATE", estValue:800000,   contractValue:200000,  date:"2026-01-14", outcome:"WON",      relStrength:2,budgetKnown:2,competitors:4,limitedInv:3,similarExp:1,noPriceBreakers:2,techAdv:2,withinExpertise:4,lowChanges:3,goodLocation:1,teamAvail:2,equipAvail:2,cashFlow:4,currWorkload:3,noImpactRunning:1,ld:2,apg:2,perfBond:4,retention:3,newSystem:2,complexMEP:4,specialAuth:3,clientRep:4,clearDwgs:1,advPayment:5,payments:5,finDuration:5 },
  { sr:17, name:"Jizan",       location:"Jazan (Jizan)",    type:"INFRASTRUCTURE",  size:"LARGE",        duration:"5 Year",   tenderType:"LIMITED",    clientCategory:"PRIVATE", estValue:2000000,  contractValue:1800000, date:"2026-02-11", outcome:"WON",      relStrength:5,budgetKnown:2,competitors:3,limitedInv:2,similarExp:3,noPriceBreakers:5,techAdv:2,withinExpertise:3,lowChanges:2,goodLocation:3,teamAvail:5,equipAvail:2,cashFlow:3,currWorkload:2,noImpactRunning:3,ld:5,apg:2,perfBond:3,retention:2,newSystem:2,complexMEP:3,specialAuth:2,clientRep:5,clearDwgs:5,advPayment:5,payments:4,finDuration:2 },
  { sr:18, name:"Ula",         location:"Al-Kharj",         type:"INFRASTRUCTURE",  size:"LARGE",        duration:"5 Year",   tenderType:"OPEN",       clientCategory:"GOV",     estValue:2000000,  contractValue:1800000, date:"2026-05-06", outcome:"LOST",     relStrength:4,budgetKnown:4,competitors:5,limitedInv:0,similarExp:1,noPriceBreakers:4,techAdv:4,withinExpertise:5,lowChanges:0,goodLocation:1,teamAvail:4,equipAvail:4,cashFlow:5,currWorkload:0,noImpactRunning:1,ld:4,apg:4,perfBond:5,retention:0,newSystem:4,complexMEP:5,specialAuth:0,clientRep:5,clearDwgs:5,advPayment:4,payments:2,finDuration:2 },
  { sr:19, name:"Ras Tanura",  location:"Al-Ula",           type:"INFRASTRUCTURE",  size:"MEGA",         duration:"5 Year",   tenderType:"NEGOTIATED", clientCategory:"PRIVATE", estValue:9000000,  contractValue:2800000, date:"2026-06-10", outcome:"REJECTED", relStrength:2,budgetKnown:3,competitors:1,limitedInv:0,similarExp:2,noPriceBreakers:2,techAdv:3,withinExpertise:1,lowChanges:0,goodLocation:2,teamAvail:2,equipAvail:3,cashFlow:1,currWorkload:0,noImpactRunning:2,ld:2,apg:3,perfBond:1,retention:0,newSystem:3,complexMEP:1,specialAuth:0,clientRep:3,clearDwgs:5,advPayment:4,payments:3,finDuration:0 },
  { sr:20, name:"Jubail",      location:"Ras Tanura",       type:"INFRASTRUCTURE",  size:"MEGA",         duration:"5 Year",   tenderType:"OPEN",       clientCategory:"SEMI",    estValue:8000000,  contractValue:4500000, date:"2026-07-15", outcome:"PENDING",  relStrength:3,budgetKnown:0,competitors:1,limitedInv:5,similarExp:4,noPriceBreakers:3,techAdv:0,withinExpertise:1,lowChanges:5,goodLocation:4,teamAvail:3,equipAvail:0,cashFlow:1,currWorkload:5,noImpactRunning:4,ld:3,apg:0,perfBond:1,retention:5,newSystem:0,complexMEP:1,specialAuth:5,clientRep:5,clearDwgs:5,advPayment:2,payments:4,finDuration:4 },
  { sr:21, name:"Hofuf",       location:"Jubail",           type:"INFRASTRUCTURE",  size:"MEGA",         duration:"5 Year",   tenderType:"NEGOTIATED", clientCategory:"GOV",     estValue:6500000,  contractValue:3500000, date:"2026-08-12", outcome:"WON",      relStrength:3,budgetKnown:2,competitors:4,limitedInv:3,similarExp:3,noPriceBreakers:3,techAdv:2,withinExpertise:4,lowChanges:3,goodLocation:3,teamAvail:3,equipAvail:2,cashFlow:4,currWorkload:3,noImpactRunning:3,ld:3,apg:2,perfBond:4,retention:3,newSystem:2,complexMEP:4,specialAuth:3,clientRep:5,clearDwgs:4,advPayment:5,payments:5,finDuration:5 },
  { sr:22, name:"Jeddah",      location:"Al Qasim",         type:"INFRASTRUCTURE",  size:"MEGA",         duration:"5 Year",   tenderType:"OPEN",       clientCategory:"GOV",     estValue:3000000,  contractValue:2800000, date:"2026-09-09", outcome:"LOST",     relStrength:2,budgetKnown:4,competitors:5,limitedInv:2,similarExp:2,noPriceBreakers:2,techAdv:4,withinExpertise:5,lowChanges:2,goodLocation:2,teamAvail:2,equipAvail:4,cashFlow:5,currWorkload:2,noImpactRunning:2,ld:2,apg:4,perfBond:5,retention:2,newSystem:4,complexMEP:5,specialAuth:2,clientRep:5,clearDwgs:5,advPayment:3,payments:4,finDuration:2 },
]

async function main() {
  const existing = await prisma.org.findFirst({ where: { slug: 'black-construction' } })
  if (existing) {
    console.log('[seed] Already seeded — skipping')
    return
  }

  const org = await prisma.org.create({
    data: { name: 'Black Construction', slug: 'black-construction' },
  })

  const admin = await prisma.user.create({
    data: {
      orgId:        org.id,
      name:         'Admin',
      email:        'admin@black.sa',
      passwordHash: await bcrypt.hash('changeme', 12),
      role:         'ADMIN',
      mustChange:   true,
    },
  })

  for (const raw of RAW_BIDS) {
    const criteria = {
      relStrength: raw.relStrength, budgetKnown: raw.budgetKnown, competitors: raw.competitors,
      limitedInv: raw.limitedInv, similarExp: raw.similarExp, noPriceBreakers: raw.noPriceBreakers,
      techAdv: raw.techAdv, withinExpertise: raw.withinExpertise, lowChanges: raw.lowChanges,
      goodLocation: raw.goodLocation, teamAvail: raw.teamAvail, equipAvail: raw.equipAvail,
      cashFlow: raw.cashFlow, currWorkload: raw.currWorkload, noImpactRunning: raw.noImpactRunning,
      ld: raw.ld, apg: raw.apg, perfBond: raw.perfBond, retention: raw.retention,
      newSystem: raw.newSystem, complexMEP: raw.complexMEP, specialAuth: raw.specialAuth,
      clientRep: raw.clientRep, clearDwgs: raw.clearDwgs, advPayment: raw.advPayment,
      payments: raw.payments, finDuration: raw.finDuration,
    }
    const derived = computeDecision(criteria)

    await prisma.bid.create({
      data: {
        sr:             raw.sr,
        orgId:          org.id,
        name:           raw.name,
        location:       raw.location,
        type:           raw.type as ProjectType,
        size:           raw.size as ProjectSize,
        duration:       raw.duration,
        tenderType:     raw.tenderType as TenderType,
        clientCategory: raw.clientCategory as ClientCategory,
        consultant:     'AECOM',
        pmc:            '',
        estValue:       raw.estValue,
        contractValue:  raw.contractValue,
        date:           new Date(raw.date),
        outcome:        raw.outcome as Outcome,
        createdBy:      admin.id,
        ...criteria,
        totalScore:     derived.totalScore,
        riskIndex:      derived.riskIndex,
        decision:       derived.decision,
        expectWin:      derived.expectWin,
        hardStop:       derived.hardStop,
      },
    })
  }

  console.log(`[seed] Created org "${org.name}", admin user, and ${RAW_BIDS.length} bids`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
