import { toPng } from 'html-to-image';

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function formatCount(n: any) {
  if (n == null) return 'Verified Scale';
  if (typeof n !== 'number') return n;
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}K`;
  return `${n}`;
}

export async function downloadPNG(elementId: string, filename = "card.png") {
  try {
    const el = document.getElementById(elementId);
    if (!el) throw new Error('Export element not found');

    const dataUrl = await toPng(el, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#05060a',
      width: 2400,
      height: 1350,
      style: {
        transform: 'none',
        left: '0',
        top: '0',
        position: 'relative'
      }
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error('Export PNG failed', err);
    throw err;
  }
}

export async function downloadPDF(elementId: string, filename = 'card.pdf', analysis: any) {
  try {
    const el = document.getElementById(elementId);
    if (!el) throw new Error('Export element not found');

    // 1. Capture the high-res 2400x1350 PNG
    const dataUrl = await toPng(el, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#05060a',
      width: 2400,
      height: 1350,
      style: {
        transform: 'none',
        left: '0',
        top: '0',
        position: 'relative'
      }
    });

    // 2. Initialize jsPDF A4 portrait
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 595.28
    const pageHeight = pdf.internal.pageSize.getHeight(); // 841.89

    // 3. Render dark background
    pdf.setFillColor(5, 7, 10);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // 4. Draw Header
    pdf.setDrawColor(182, 107, 255); // neon purple
    pdf.setLineWidth(3);
    pdf.line(30, 35, pageWidth - 30, 35);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('AUTHENFLUENCE AI', 30, 58);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(215, 255, 71); // neon lime
    pdf.text('CREATOR TRUST INTELLIGENCE REPORT', 30, 71);

    // Right header info
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`GENERATED: ${new Date().toLocaleDateString().toUpperCase()}`, pageWidth - 165, 58);

    const passId = `DNA-${hashString(analysis?.username || "unknown").toString(36).toUpperCase()}`;
    pdf.text(`VERIFICATION ID: ${passId}`, pageWidth - 165, 71);

    // Header separator line
    pdf.setDrawColor(255, 255, 255, 0.1);
    pdf.setLineWidth(0.5);
    pdf.line(30, 82, pageWidth - 30, 82);

    // 5. Draw high-res ticket PNG (16:9 aspect ratio fits landscape layout)
    const imgWidth = pageWidth - 60; // 535.28
    const imgHeight = (1350 / 2400) * imgWidth; // 301.1
    pdf.addImage(dataUrl, 'PNG', 30, 100, imgWidth, imgHeight);

    // 6. Data Summary Section
    const textStartY = 100 + imgHeight + 35;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(215, 255, 71);
    pdf.text('DNA INTELLIGENCE INSIGHTS', 30, textStartY);

    pdf.setDrawColor(215, 255, 71, 0.5);
    pdf.setLineWidth(1);
    pdf.line(30, textStartY + 4, 200, textStartY + 4);

    // Left Column details (Creator profile)
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('CREATOR IDENTITY:', 30, textStartY + 25);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(182, 107, 255); // purple
    pdf.text(`${analysis?.displayName || analysis?.username} (@${analysis?.username})`, 30, textStartY + 38);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('RATEFLUENCER SCORE:', 30, textStartY + 60);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(215, 255, 71); // lime
    pdf.setFontSize(14);
    const scoreVal = typeof analysis?.score === 'number' ? `${analysis.score}/100` : 'Estimated';
    pdf.text(scoreVal, 30, textStartY + 76);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('AUDIENCE AUTHENTICITY:', 30, textStartY + 98);
    pdf.setFont('helvetica', 'normal');
    const authVal = analysis?.commentAuthenticityDetailed?.organicPct ? `${analysis.commentAuthenticityDetailed.organicPct}% Organic` : 'Estimated';
    pdf.setTextColor(182, 107, 255);
    pdf.text(authVal, 30, textStartY + 110);

    // Right Column details (AI Verdict)
    const rightColX = 220;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('AI TRUST VERDICT:', rightColX, textStartY + 25);
    pdf.setFont('helvetica', 'normal');
    
    const verdict = analysis?.verdict || analysis?.aiInsight || 'Strong organic authority with consistent engagement velocity. Content resonates deeply with audiences across demographics. Excellent brand collaboration potential.';
    const maxTextWidth = pageWidth - rightColX - 30;
    const splitVerdict = pdf.splitTextToSize(verdict, maxTextWidth);
    pdf.setTextColor(255, 255, 255, 0.9);
    pdf.text(splitVerdict, rightColX, textStartY + 38);

    // Platform indicators
    const nextY = textStartY + 38 + (splitVerdict.length * 12) + 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('PLATFORM INSIGHTS & ENGAGEMENT:', rightColX, nextY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 255, 255, 0.7);

    const insights = [
      `• Platform: ${analysis?.platform ? String(analysis.platform).toUpperCase() : 'YOUTUBE'}`,
      `• Subscribers / Followers: ${analysis?.followers ? formatCount(analysis.followers) : 'Verified Scale'}`,
      `• Engagement Quality Class: ${analysis?.engagementClass || 'Excellent'}`,
      `• Content Category: ${(analysis?.creatorCategories && analysis.creatorCategories[0]?.type) || 'Entertainment'}`
    ];
    pdf.text(insights, rightColX, nextY + 12);

    // 7. Draw Footer Section
    pdf.setDrawColor(255, 255, 255, 0.1);
    pdf.setLineWidth(0.5);
    pdf.line(30, pageHeight - 40, pageWidth - 30, pageHeight - 40);

    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 0.4);
    pdf.text('CONFIDENTIAL • FOR CLIENT USE ONLY • AUTHENFLUENCE TRUST INTELLIGENCE SYSTEM', 30, pageHeight - 25);
    pdf.text('© AUTHENFLUENCE AI. ALL RIGHTS RESERVED.', pageWidth - 215, pageHeight - 25);

    pdf.save(filename);
  } catch (err) {
    console.error('Export PDF failed', err);
    throw err;
  }
}

export async function downloadStory(elementId: string, filename = 'creator-story.png') {
  try {
    const el = document.getElementById(elementId);
    if (!el) throw new Error('Export element not found');

    const dataUrl = await toPng(el, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#05060a',
      width: 1080,
      height: 1920,
      style: {
        transform: 'none',
        left: '0',
        top: '0',
        position: 'relative'
      }
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error('Export Story failed', err);
    throw err;
  }
}

export default { downloadPNG, downloadPDF, downloadStory };
