import prisma from '@/lib/prisma';

export async function sendAlert(oltId: number, oltName: string, status: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  // Log to database first
  try {
     await prisma.logAlert.create({
        data: {
           oltId,
           alertType: status,
           message: `[${oltName}] ${message}`
        }
     });
  } catch (e) {
     console.error("Failed to save LogAlert:", e);
  }

  // Send Telegram message if configured
  if (botToken && chatId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `⚠️ ALERT: OLT ${oltName} is ${status}.\n\nDetails: ${message}`
        })
      });
    } catch (error) {
      console.error("Failed to send Telegram alert:", error);
    }
  }
}
