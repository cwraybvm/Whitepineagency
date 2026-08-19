// Default BVM sales email templates, seeded into BvmEmailTemplate on first
// load of the Email Template Vault if the table is empty.
export const BVM_TEMPLATE_VARIABLES = ['{{clientName}}', '{{magazineZone}}', '{{senderName}}'] as const;

export const DEFAULT_BVM_EMAIL_TEMPLATES = [
  {
    name: 'LMGK Follow-Up (Left Message - Good Prospect)',
    category: 'LMGK Follow-up',
    subject: 'Following up — {{senderName}} from BVM',
    body: `Hi {{clientName}},

I tried reaching you by phone today but wasn't able to connect. I'd love to tell you about the advertising opportunity we have for businesses in {{magazineZone}} — it's a great fit for what you're doing.

Do you have a few minutes this week for a quick call? Let me know what works best for you.

Best,
{{senderName}}`,
  },
  {
    name: 'Post-Call Sponsorship Intro & Sample Request',
    category: 'Post-Call Thank You',
    subject: 'Great speaking with you, {{clientName}}!',
    body: `Hi {{clientName}},

Thanks for taking the time to chat today. As promised, here's a bit more information on the sponsorship opportunity we discussed for {{magazineZone}}.

I'd like to send over a sample copy of the publication so you can see the quality firsthand — just confirm the best mailing address and I'll get one out to you this week.

Looking forward to working together,
{{senderName}}`,
  },
  {
    name: 'New Address Welcome / BVM Publication Introduction',
    category: 'Magazine Sample',
    subject: 'Introducing BVM to {{clientName}}',
    body: `Hi {{clientName}},

Welcome! I wanted to personally introduce you to BVM and the publication we distribute in {{magazineZone}}. We work with local businesses like yours to connect with residents through direct-mail advertising that actually gets read.

I'll be following up shortly to answer any questions and see if it's a good fit. In the meantime, feel free to reach out anytime.

Best,
{{senderName}}`,
  },
] as const;
