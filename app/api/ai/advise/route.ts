import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      location,
      type,
      size,
      totalScore,
      decision,
      riskIndex,
      expectWin,
      hardStop,
      lang,
      criteria = {} as Record<string, number>,
    } = body;

    const systemPrompt = `You are a senior bid consultant for the Saudi construction industry.
Analyze this bid and provide a professional advisory in exactly THREE sections.
Use this exact format:

## 1. Business Perspective
• [bullet]
• [bullet]
• [bullet]

## 2. Risk Management
• [bullet]
• [bullet]
• [bullet]

## 3. Project Management
• [bullet]
• [bullet]
• [bullet]

Each section must have 3-5 bullets. Each bullet: 1-2 sentences.
Ground every point in the actual scores provided. Be specific, not generic.
${lang === 'ar' ? 'Respond in Arabic.' : 'Respond in English.'}`;

    const userMessage = `Project: ${name} | Location: ${location} | Type: ${type} | Size: ${size}
Score: ${totalScore}/135 | Decision: ${decision} | CFR Risk: ${riskIndex} | Win Probability: ${Math.round(expectWin * 100)}%${hardStop ? ' | HARD STOP: YES' : ''}

Criteria scores (0-5 scale):
Competitive Position: relStrength=${criteria.relStrength}, budgetKnown=${criteria.budgetKnown}, competitors=${criteria.competitors}, limitedInv=${criteria.limitedInv}, similarExp=${criteria.similarExp}, noPriceBreakers=${criteria.noPriceBreakers}, techAdv=${criteria.techAdv}, withinExpertise=${criteria.withinExpertise}, lowChanges=${criteria.lowChanges}, goodLocation=${criteria.goodLocation}
Load Factor: teamAvail=${criteria.teamAvail}, equipAvail=${criteria.equipAvail}, cashFlow=${criteria.cashFlow}, currWorkload=${criteria.currWorkload}, noImpactRunning=${criteria.noImpactRunning}
Contractual: ld=${criteria.ld}, apg=${criteria.apg}, perfBond=${criteria.perfBond}, retention=${criteria.retention}
Technical: newSystem=${criteria.newSystem}, complexMEP=${criteria.complexMEP}, specialAuth=${criteria.specialAuth}
Commercial: clientRep=${criteria.clientRep}, clearDwgs=${criteria.clearDwgs}, advPayment=${criteria.advPayment}, payments=${criteria.payments}, finDuration=${criteria.finDuration}`;

    const response = await fetch(
      'https://text.pollinations.ai/openai/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          max_tokens: 600,
          temperature: 0.4,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      }
    );

    const data = await response.json();
    const content: string =
      data?.choices?.[0]?.message?.content ?? 'Advisory unavailable at this time.';

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: 'Advisory unavailable at this time.' });
  }
}
