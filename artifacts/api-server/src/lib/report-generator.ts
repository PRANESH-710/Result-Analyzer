import type { AnalysisResult } from './analysis.js';
import PDFDocument from 'pdfkit';

export function generateMarkdownReport(analysis: AnalysisResult, showStudentIds: boolean): string {
  const dp = 2;
  const report: string[] = [];
  const generatedAt = new Date().toLocaleString();

  report.push('# Result Analysis Report');
  report.push('============================================================');
  report.push('');
  report.push(`Generated: ${generatedAt}`);
  report.push('');
  report.push('## Executive Summary');
  report.push('');
  report.push(`**Total Students Analyzed:** ${analysis.totalStudents}`);
  report.push(`**Total Subjects:** ${analysis.totalSubjects}`);
  report.push(`**Department Pass Rate:** ${analysis.departmentPassRate.toFixed(dp)}%`);
  report.push(`**Pass Criteria:** ${analysis.passPercentage.toFixed(dp)}% minimum per subject`);
  report.push('');

  report.push('## Key Findings');
  report.push('');
  report.push('### Department Performance');
  report.push(`- ${analysis.studentsPassedAll} students passed all subjects`);
  report.push(`- ${analysis.studentsFailedAny} students failed at least one subject`);
  report.push(`- Average score across all subjects: ${analysis.averageScore.toFixed(dp)}%`);
  report.push('');

  if (analysis.overallTopStudent) {
    const name = maskName(analysis.overallTopStudent.name, showStudentIds);
    report.push('### Overall Top Performer');
    report.push('');
    report.push(`**${name}** with an average score of **${analysis.overallTopStudent.average.toFixed(dp)}%**`);
    report.push('');
  }

  report.push('## Subject-wise Analysis');
  report.push('');
  report.push('### Subject Performance Summary');
  report.push('');
  report.push('| Subject | Students | Pass Rate | Fail Rate | Avg Score | Highest | Topper |');
  report.push('|:--------|---------:|----------:|----------:|----------:|--------:|:-------|');

  for (const [subject, stats] of Object.entries(analysis.subjectWiseStats)) {
    const topperName = maskName(stats.topper.name, showStudentIds);
    report.push(
      `| ${subject} | ${stats.totalCount} | ${stats.passRate.toFixed(dp)}% | ${stats.failRate.toFixed(dp)}% | ${stats.averageScore.toFixed(dp)} | ${stats.highestScore.toFixed(dp)} | ${topperName} |`,
    );
  }
  report.push('');

  report.push('### Detailed Subject Analysis');
  report.push('');
  for (const [subject, stats] of Object.entries(analysis.subjectWiseStats)) {
    const topperName = maskName(stats.topper.name, showStudentIds);
    report.push(`#### ${subject}`);
    report.push(`- **Pass Threshold Used:** ${stats.passPercentageUsed.toFixed(dp)}%`);
    report.push(`- **Total Students:** ${stats.totalCount}`);
    report.push(`- **Passed:** ${stats.passedCount} (${stats.passRate.toFixed(dp)}%)`);
    report.push(`- **Failed:** ${stats.failedCount} (${stats.failRate.toFixed(dp)}%)`);
    report.push(`- **Average Score:** ${stats.averageScore.toFixed(dp)}`);
    report.push(`- **Score Range:** ${stats.lowestScore.toFixed(dp)} - ${stats.highestScore.toFixed(dp)}`);
    report.push(`- **Top Performer:** ${topperName} (${stats.topper.score.toFixed(dp)}%)`);
    report.push('');
  }

  report.push('## Top Performing Students');
  report.push('');
  report.push('| Rank | Student | Average Score |');
  report.push('|-----:|:--------|--------------:|');
  analysis.topStudents.slice(0, 10).forEach((s, i) => {
    const name = maskName(s.name, showStudentIds);
    report.push(`| ${i + 1} | ${name} | ${s.average.toFixed(dp)}% |`);
  });
  report.push('');

  if (analysis.anomalies.length > 0) {
    report.push('## Anomalies and Concerns');
    report.push('');
    for (const a of analysis.anomalies) {
      report.push(`- ${a.type.replace(/_/g, ' ')}: ${a.description}`);
    }
    report.push('');
  }

  report.push('## Recommendations');
  report.push('');
  const recommendations = generateRecommendations(analysis);
  for (const recommendation of recommendations) {
    report.push(`- ${recommendation}`);
  }
  report.push('');

  report.push('---');
  report.push('This report was generated automatically by the Result Analysis Report system.');
  report.push('');

  return report.join('\n');
}

export function generatePdfReport(
  analysis: AnalysisResult,
  showStudentIds: boolean,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: 'Result Analysis Report',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const dp = 2;
    const pageLeft = 40;
    const pageWidth = 515;
    const pageBottom = 800;
    const headingColor = '#2563eb';
    const contentColor = '#111827';
    const headingSize = 14;
    const contentSize = 12;
    const contentLineGap = 6;
    const topicToContentGap = 1.5;

    const ensureSpace = (requiredHeight: number) => {
      if (doc.y + requiredHeight > pageBottom) {
        doc.addPage();
      }
    };

    const section = (title: string) => {
      ensureSpace(70);
      doc.moveDown(0.8);
      doc
        .fillColor(headingColor)
        .fontSize(headingSize)
        .font('Helvetica-Bold')
        .text(title, pageLeft, doc.y, { width: pageWidth, align: 'center' });
      doc.moveDown(topicToContentGap);
      doc.strokeColor('#dddddd').lineWidth(1).moveTo(pageLeft, doc.y).lineTo(pageLeft + pageWidth, doc.y).stroke();
      doc.moveDown(topicToContentGap);
      doc.fillColor(contentColor).font('Helvetica').fontSize(contentSize);
    };

    const kv = (k: string, v: string) => {
      ensureSpace(22);
      doc.fillColor(contentColor).font('Helvetica').fontSize(contentSize).text(`${k}: ${v}`, pageLeft, doc.y, {
        width: pageWidth,
        align: 'center',
        lineGap: contentLineGap,
      });
    };

    const drawBarChart = (
      title: string,
      labels: string[],
      values: number[],
      color: string,
      maxValue = 100,
    ) => {
      if (labels.length === 0 || values.length === 0) {
        return;
      }

      const chartHeight = 170;
      const chartWidth = 470;
      const startX = pageLeft + 20;

      ensureSpace(chartHeight + 70);

      doc
        .fillColor(headingColor)
        .font('Helvetica-Bold')
        .fontSize(headingSize)
        .text(title, pageLeft, doc.y, { width: pageWidth, align: 'center' });

      doc.moveDown(topicToContentGap);
      const startY = doc.y;

      const barCount = Math.min(labels.length, values.length);
      const gap = 8;
      const barWidth = Math.max(10, Math.floor((chartWidth - gap * (barCount - 1)) / barCount));

      doc.save();
      doc.strokeColor('#cfcfcf').lineWidth(1);
      doc.moveTo(startX, startY).lineTo(startX, startY + chartHeight).lineTo(startX + chartWidth, startY + chartHeight).stroke();

      for (let i = 0; i < barCount; i += 1) {
        const value = Math.max(0, values[i]);
        const ratio = Math.min(1, value / Math.max(1, maxValue));
        const barHeight = ratio * (chartHeight - 10);
        const x = startX + i * (barWidth + gap);
        const y = startY + chartHeight - barHeight;

        doc.fillColor(color).rect(x, y, barWidth, barHeight).fill();

        const label = labels[i].length > 12 ? `${labels[i].slice(0, 10)}..` : labels[i];
        doc.fillColor('#333333').fontSize(8).font('Helvetica').text(label, x, startY + chartHeight + 4, {
          width: barWidth,
          align: 'center',
        });
        doc.fontSize(8).text(`${value.toFixed(1)}%`, x, y - 12, { width: barWidth, align: 'center' });
      }

      doc.restore();
      doc.y = startY + chartHeight + 24;
      doc.moveDown(0.3);
    };

    doc
      .fillColor(headingColor)
      .font('Helvetica-Bold')
      .fontSize(headingSize)
      .text('Result Analysis Report', pageLeft, doc.y, { width: pageWidth, align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(contentColor).font('Helvetica').fontSize(contentSize).text(`Generated: ${new Date().toLocaleString()}`, pageLeft, doc.y, {
      width: pageWidth,
      align: 'center',
      lineGap: contentLineGap,
    });

    section('Executive Summary');
    kv('Total Students', String(analysis.totalStudents));
    kv('Total Subjects', String(analysis.totalSubjects));
    kv('Department Pass Rate', `${analysis.departmentPassRate.toFixed(dp)}%`);
    kv('Average Score', `${analysis.averageScore.toFixed(dp)}%`);
    kv('Pass Criteria', `${analysis.passPercentage.toFixed(dp)}%`);
    kv('Students Passed All', String(analysis.studentsPassedAll));
    kv('Students Failed Any', String(analysis.studentsFailedAny));

    drawBarChart(
      'Overall Snapshot',
      ['Pass Rate', 'Avg Score', 'Students Passed All'],
      [
        analysis.departmentPassRate,
        analysis.averageScore,
        analysis.totalStudents > 0 ? (analysis.studentsPassedAll / analysis.totalStudents) * 100 : 0,
      ],
      '#2563eb',
      100,
    );

    if (analysis.overallTopStudent) {
      section('Overall Top Performer');
      const name = showStudentIds
        ? analysis.overallTopStudent.name
        : `Student_${Math.abs(hashCode(analysis.overallTopStudent.name)) % 10000}`;
      kv('Student', name);
      kv('Average', `${analysis.overallTopStudent.average.toFixed(dp)}%`);
    }

    section('Subject-wise Performance');
    const subjects = Object.entries(analysis.subjectWiseStats);

    drawBarChart(
      'Subject Pass Rate Graph',
      subjects.map(([subject]) => subject),
      subjects.map(([, stats]) => stats.passRate),
      '#16a34a',
      100,
    );

    for (const [subject, stats] of subjects) {
      const topperName = maskName(stats.topper.name, showStudentIds);

      doc.fillColor(headingColor).font('Helvetica-Bold').fontSize(headingSize).text(subject, {
        continued: false,
        lineGap: contentLineGap,
        align: 'center',
        width: pageWidth,
      });
      doc.fillColor(contentColor).font('Helvetica').fontSize(contentSize);
      doc.text(
        `Threshold ${stats.passPercentageUsed.toFixed(dp)}% | Total ${stats.totalCount} | Pass ${stats.passRate.toFixed(dp)}% | Fail ${stats.failRate.toFixed(dp)}%`,
        pageLeft,
        doc.y,
        {
          width: pageWidth,
          align: 'center',
          lineGap: contentLineGap,
        },
      );
      doc.text(
        `Average ${stats.averageScore.toFixed(dp)} | Range ${stats.lowestScore.toFixed(dp)}-${stats.highestScore.toFixed(dp)} | Topper ${topperName} (${stats.topper.score.toFixed(dp)}%)`,
        pageLeft,
        doc.y,
        {
          width: pageWidth,
          align: 'center',
          lineGap: contentLineGap,
        },
      );
      doc.moveDown(0.2);

      ensureSpace(22);
    }

    section('Top 10 Students');
    analysis.topStudents.slice(0, 10).forEach((student, index) => {
      const name = maskName(student.name, showStudentIds);
      doc.text(
        `${index + 1}. ${name} - ${student.average.toFixed(dp)}% (${student.totalSubjects} subjects)`,
        pageLeft,
        doc.y,
        {
          width: pageWidth,
          align: 'center',
          lineGap: contentLineGap,
        },
      );
    });

    if (analysis.anomalies.length > 0) {
      section('Anomalies & Concerns');
      analysis.anomalies.forEach((anomaly) => {
        doc.text(`- ${anomaly.description}`, pageLeft, doc.y, {
          width: pageWidth,
          align: 'center',
          lineGap: contentLineGap,
        });
      });
    }

    section('Recommendations');
    const recommendations = generateRecommendations(analysis);
    recommendations.forEach((recommendation) => {
      doc.text(`- ${recommendation}`, pageLeft, doc.y, {
        width: pageWidth,
        align: 'center',
        lineGap: contentLineGap,
      });
    });

    doc.end();
  });
}

function maskName(name: string, showStudentIds: boolean): string {
  if (showStudentIds) {
    return name;
  }
  return `Student_${Math.abs(hashCode(name)) % 10000}`;
}

function generateRecommendations(analysis: AnalysisResult): string[] {
  const recommendations: string[] = [];

  if (analysis.departmentPassRate < 50) {
    recommendations.push('Critical: Department pass rate is below 50%. Review curriculum and teaching methods.');
  } else if (analysis.departmentPassRate < 70) {
    recommendations.push('Department pass rate needs improvement. Identify and support struggling students early.');
  }

  for (const [subject, stats] of Object.entries(analysis.subjectWiseStats)) {
    if (stats.passRate < 40) {
      recommendations.push(`${subject}: Very low pass rate (${stats.passRate.toFixed(1)}%). Consider additional support and curriculum review.`);
    } else if (stats.passRate < 60) {
      recommendations.push(`${subject}: Below-average performance. Consider targeted interventions.`);
    }
  }

  if (analysis.studentsFailedAny > analysis.totalStudents * 0.3) {
    recommendations.push('High number of students are failing at least one subject. Consider peer tutoring and remediation support.');
  }

  for (const anomaly of analysis.anomalies) {
    if (anomaly.type === 'zero_scores') {
      recommendations.push(`Investigate zero scores in ${anomaly.subject ?? 'the subject'}. This may indicate attendance or assessment issues.`);
    } else if (anomaly.type === 'excessive_perfect_scores') {
      recommendations.push(`Review assessment difficulty in ${anomaly.subject ?? 'the subject'} due to many perfect scores.`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Overall performance is satisfactory. Continue monitoring and supporting student progress.');
  }

  recommendations.push('Regular monitoring and early intervention for at-risk students is recommended.');
  recommendations.push('Conduct subject-wise faculty reviews to discuss improvement strategies.');

  return recommendations;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
