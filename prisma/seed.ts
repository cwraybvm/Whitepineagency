import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'TRK Ministries',
      slug: 'default-org',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created Organization:', org.name);

  // 2. Default Board Columns
  const columnsData = [
    { title: '📋 Backlog / To Do', orderPosition: 0 },
    { title: '⚡ In Progress', orderPosition: 1 },
    { title: '👁️ Client Review', orderPosition: 2 },
    { title: '✅ Completed', orderPosition: 3 },
  ];

  for (const col of columnsData) {
    const createdCol = await prisma.taskColumn.create({
      data: {
        organizationId: org.id,
        title: col.title,
        orderPosition: col.orderPosition,
      },
    });

    // Create a starter card in Backlog
    if (col.orderPosition === 0) {
      await prisma.taskCard.create({
        data: {
          organizationId: org.id,
          columnId: createdCol.id,
          title: 'Setup Twilio Speed-to-Lead Automation',
          description: 'Configure instant SMS dispatch for form fills.',
          tagLabel: 'High Priority',
          tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dueDate: 'Jul 26',
          assignee: 'Colin',
          orderPosition: 0,
        },
      });
    }
  }

  console.log('✅ Default Trello columns and tasks seeded successfully!');

  // 3. Demo client portal workspace (Apex Mechanical) with sample inbound leads
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-apex-plumbing' },
    update: {
      domain: 'apexmechanicalmn.com',
      primaryKeyword: 'emergency plumber Alexandria MN',
    },
    create: {
      name: 'Apex Mechanical Services',
      slug: 'demo-apex-plumbing',
      status: 'ACTIVE',
      domain: 'apexmechanicalmn.com',
      primaryKeyword: 'emergency plumber Alexandria MN',
    },
  });

  const existingPortalLeads = await prisma.portalLead.count({ where: { organizationId: demoOrg.id } });

  if (existingPortalLeads === 0) {
    const now = Date.now();
    const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);

    await prisma.portalLead.create({
      data: {
        organizationId: demoOrg.id,
        customerName: 'Mark Johnson',
        phone: '555-019-2834',
        address: '104 Main Street, Alexandria, MN',
        createdAt: hoursAgo(1),
        title: 'After-Hours Emergency Call Intercepted',
        subtitle: 'Water heater actively leaking in basement.',
        jobCategory: 'Water Heater Replacement',
        badge: '🤖 AI Receptionist',
        badgeColor: 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/30',
        source: 'google_maps',
        fmsStatus: 'synced',
        fmsJobId: 'JOB-9921',
        estimatedValue: 1800,
        closedValue: 1800,
        status: 'won',
        assignedTechId: 't1',
        isVip: true,
        pastJobCount: 3,
        isPinned: false,
        dispatchNote: 'Customer said dog is friendly in backyard.',
        aiIssue: '50-Gal Water Heater Leaking in Basement',
        aiIssueAudioTime: 4,
        aiLocation: '104 Main St, Alexandria, MN',
        aiLocationAudioTime: 18,
        aiRequestedTime: 'Tomorrow @ 8:00 AM',
        aiTimeAudioTime: 28,
        hasAudio: true,
        audioDuration: '38s',
        transcript: 'AI: "Thank you for calling Apex. I can dispatch a tech tomorrow at 8:00 AM. May I get your address?"\nCaller: "Yes, 104 Main Street!"\nAI: "Mark is assigned, SMS sent in 30 seconds."',
        history: {
          create: [
            { event: 'After-Hours Call Intercepted by AI Agent', statusBadge: 'AI Captured', createdAt: hoursAgo(1) },
            { event: 'Job Auto-Synced to ServiceTitan (#JOB-9921)', statusBadge: 'Synced', createdAt: hoursAgo(1) },
            { event: 'Invoice Paid ($1,800.00) via Apple Pay', statusBadge: 'Paid', createdAt: hoursAgo(0.5) },
          ],
        },
        chatMessages: {
          create: [
            { sender: 'system', text: 'Apex AI: Thanks for calling! Tech Mark is dispatched for 8:00 AM tomorrow.', createdAt: hoursAgo(1) },
            { sender: 'customer', text: 'Can he bring an extra 50-gallon tank just in case?', createdAt: hoursAgo(0.9) },
          ],
        },
      },
    });

    await prisma.portalLead.create({
      data: {
        organizationId: demoOrg.id,
        customerName: 'Sarah Miller',
        phone: '555-882-1049',
        address: '410 Maple Ave, Alexandria, MN',
        createdAt: hoursAgo(4),
        title: 'Database Reactivation Reply Received',
        subtitle: 'Customer replied "YES" to seasonal AC tune-up drip.',
        jobCategory: 'AC Tune-Up Inspection',
        badge: '📈 Past Client Reachout',
        badgeColor: 'bg-purple-950/90 text-purple-200 border border-purple-500/30',
        source: 'organic_web',
        fmsStatus: 'manual_needed',
        estimatedValue: 450,
        status: 'pending',
        assignedTechId: 't2',
        unrepliedMinutes: 28,
        isDuplicate: true,
        duplicateCount: 2,
        isPinned: true,
        aiIssue: 'Requested $79 Seasonal AC Inspection',
        aiIssueAudioTime: 2,
        aiLocation: '410 Maple Ave, Alexandria, MN',
        aiLocationAudioTime: 12,
        aiRequestedTime: 'Friday Afternoon',
        aiTimeAudioTime: 22,
        history: {
          create: [
            { event: 'Automated Tune-Up SMS Fired', statusBadge: 'SMS Fired', createdAt: hoursAgo(4) },
            { event: 'Customer Replied "YES, BOOK ME"', statusBadge: 'Customer Replied', createdAt: hoursAgo(3.9) },
            { event: 'Secondary Web Form Submission Merged', statusBadge: 'Merged', createdAt: hoursAgo(3.8) },
          ],
        },
        chatMessages: {
          create: [
            { sender: 'system', text: 'Apex Mechanical: Hi Sarah, time for your $79 AC Tune-Up! Reply YES to book.', createdAt: hoursAgo(4) },
            { sender: 'customer', text: 'YES, please book us for Friday afternoon.', createdAt: hoursAgo(3.9) },
          ],
        },
      },
    });

    await prisma.portalLead.create({
      data: {
        organizationId: demoOrg.id,
        customerName: 'Dave Miller',
        phone: '555-392-0012',
        address: '882 Oak Lane, Alexandria, MN',
        createdAt: hoursAgo(26),
        title: 'Missed-Call Safety Net Recovered',
        subtitle: 'Main drain backed up, emergency snake completed.',
        jobCategory: 'Main Sewer Line Snaking',
        badge: '💬 Instant Text Auto-Reply',
        badgeColor: 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/30',
        source: 'google_lsa',
        fmsStatus: 'synced',
        fmsJobId: 'JOB-8812',
        estimatedValue: 650,
        closedValue: 650,
        status: 'won',
        assignedTechId: 't3',
        isVip: true,
        pastJobCount: 2,
        aiIssue: 'Main Sewer Line Backed Up In Basement',
        aiIssueAudioTime: 5,
        aiLocation: '882 Oak Lane, Alexandria, MN',
        aiLocationAudioTime: 14,
        aiRequestedTime: 'Immediate Dispatch',
        aiTimeAudioTime: 20,
        history: {
          create: [
            { event: 'Safety Net Auto-SMS Fired in 11s', statusBadge: 'SMS Fired', createdAt: hoursAgo(26) },
          ],
        },
        chatMessages: {
          create: [
            { sender: 'system', text: 'Sorry we missed your call! How can Apex help you today?', createdAt: hoursAgo(26) },
            { sender: 'customer', text: 'Need a main drain snake right away.', createdAt: hoursAgo(25.9) },
          ],
        },
      },
    });

    console.log('✅ Seeded demo Apex Mechanical portal leads');
  } else {
    console.log('↷ Demo portal leads already exist, skipping');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });