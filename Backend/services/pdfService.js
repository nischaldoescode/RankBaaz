import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * PDF Service for generating test result PDFs
 * @module services/pdfService
 */

class PDFService {
  /**
   * Generate PDF for test result
   * @param {Object} testResult - Test result data from database
   * @param {Object} course - Course data from database
   * @param {Object} user - User data (name, email)
   * @param {Boolean} isAdmin - Whether requester is admin
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateTestResultPDF(testResult, course, user, isAdmin = false) {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: "A4",
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
          info: {
            Title: `${course.name} - Test Result`,
            Author: "RankBaaz",
            Subject: "Test Result Report",
            Keywords: "test, result, report",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Page counter
        let pageNumber = 1;

        // Helper function to add watermark
        const addWatermark = () => {
          doc.save();
          doc
            .fontSize(60)
            .fillColor("#000000", 0.05)
            .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
            .text("RankBaaz", 0, doc.page.height / 2, {
              align: "center",
              lineBreak: false,
            });
          doc.restore();
        };

        // Helper function to add footer
        const addFooter = () => {
          const footerY = doc.page.height - 30;

          // Page number (center)
          doc
            .fontSize(10)
            .fillColor("#666666")
            .text(`Page ${pageNumber}`, 0, footerY, {
              align: "center",
              width: doc.page.width,
            });

          // Username (right) - Show "Admin" for admin, user name for users
          const displayName = isAdmin ? "Admin" : user.name || user.email;
          doc.text(displayName, doc.page.width - 150, footerY, {
            width: 100,
            align: "right",
          });

          pageNumber++;
        };

        // ========== FIRST PAGE: TITLE PAGE ==========
        addWatermark();

        // Course Name (Centered, Large)
        doc
          .fontSize(28)
          .fillColor("#1a1a1a")
          .text(course.name, {
            align: "center",
            width: doc.page.width - 100,
          });

        doc.moveDown(2);

        // Test Result Title
        doc.fontSize(20).fillColor("#4a5568").text("Test Result Report", {
          align: "center",
        });

        doc.moveDown(4);

        // User Information Box
        const infoBoxY = doc.y;
        doc
          .roundedRect(75, infoBoxY, doc.page.width - 150, 120, 5)
          .fillAndStroke("#f7fafc", "#e2e8f0");

        doc
          .fillColor("#2d3748")
          .fontSize(14)
          .text("Candidate Information", 90, infoBoxY + 20, {
            underline: true,
          });

        doc.moveDown(1);
        doc
          .fontSize(12)
          .fillColor("#4a5568")
          .text(`Name: ${user.name}`, 90, doc.y);

        doc.moveDown(0.5);
        doc.text(`Email: ${user.email}`, 90, doc.y);

        doc.moveDown(0.5);
        doc.text(
          `Date: ${new Date(testResult.completedAt).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          )}`,
          90,
          doc.y
        );

        // Test Statistics Box
        doc.moveDown(3);
        const statsBoxY = doc.y;
        doc
          .roundedRect(75, statsBoxY, doc.page.width - 150, 180, 5)
          .fillAndStroke("#f0fdf4", "#86efac");

        doc
          .fillColor("#166534")
          .fontSize(14)
          .text("Test Statistics", 90, statsBoxY + 20, {
            underline: true,
          });

        doc.moveDown(1);
        doc.fontSize(12).fillColor("#15803d");

        const stats = [
          `Score: ${testResult.totalScore}/${testResult.maxPossibleScore}`,
          `Percentage: ${testResult.percentage.toFixed(2)}%`,
          `Correct Answers: ${testResult.correctAnswers}`,
          `Wrong Answers: ${testResult.wrongAnswers}`,
          `Unanswered: ${testResult.unanswered}`,
          `Time Taken: ${Math.floor(testResult.timeTaken / 60)} min ${testResult.timeTaken % 60} sec`,
        ];

        stats.forEach((stat, index) => {
          doc.text(stat, 90, statsBoxY + 60 + index * 20);
        });

        addFooter();

        // ========== QUESTIONS PAGES ==========

        // Group questions by difficulty
        const questionsByDifficulty = {};
        testResult.questions.forEach((q) => {
          const diff = q.difficulty || "Unknown";
          if (!questionsByDifficulty[diff]) {
            questionsByDifficulty[diff] = [];
          }
          questionsByDifficulty[diff].push(q);
        });

        // Sort difficulties: Easy -> Medium -> Hard
        const difficultyOrder = ["Easy", "Medium", "Hard"];
        const sortedDifficulties = Object.keys(questionsByDifficulty).sort(
          (a, b) => {
            return difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b);
          }
        );

        // Iterate through each difficulty
        for (const difficulty of sortedDifficulties) {
          const questions = questionsByDifficulty[difficulty];

          // New page for each difficulty
          doc.addPage();
          addWatermark();

          // Difficulty Header
          const difficultyColor =
            difficulty === "Easy"
              ? "#16a34a"
              : difficulty === "Medium"
                ? "#eab308"
                : "#dc2626";

          doc
            .fontSize(20)
            .fillColor(difficultyColor)
            .text(`${difficulty} Difficulty`, {
              align: "center",
              underline: true,
            });

          doc.moveDown(1.5);

          // Iterate through questions in this difficulty
          questions.forEach((questionData, qIndex) => {
            const questionNum = qIndex + 1;

            // Find full question details from course
            const fullQuestion = course.questions.find(
              (q) => q._id.toString() === questionData.question.toString()
            );

            if (!fullQuestion) return; // Skip if question not found

            // Check if we need a new page (rough estimate)
            if (doc.y > doc.page.height - 200) {
              addFooter();
              doc.addPage();
              addWatermark();

              // Re-add difficulty header on new page
              doc
                .fontSize(16)
                .fillColor(difficultyColor)
                .text(`${difficulty} Difficulty (continued)`, {
                  align: "center",
                });
              doc.moveDown(1);
            }

            // Question Number and Text with better spacing
            doc
              .fontSize(12)
              .fillColor("#1a1a1a")
              .text(`${questionNum}. `, {
                continued: true,
                width: 35,
              })
              .text(fullQuestion.question, {
                width: doc.page.width - 130,
                align: "left",
                lineGap: 3, // Add line spacing within question text
              });

            doc.moveDown(0.8); // Increased spacing after question

            // Question Image (if exists)
            if (fullQuestion.image && fullQuestion.image.url) {
              try {
                // Note: You'll need to fetch and embed the image
                // For now, just add placeholder text
                doc.fontSize(10).fillColor("#6b7280").text("[Image attached]", {
                  indent: 20,
                });
                doc.moveDown(0.5);
              } catch (imgError) {
                console.error("Error embedding image:", imgError);
              }
            }

            // Options (for multiple choice and true/false)
            if (
              fullQuestion.questionType === "multiple" ||
              fullQuestion.questionType === "truefalse"
            ) {
              doc.fontSize(11).fillColor("#4b5563");

              fullQuestion.options.forEach((option, optIndex) => {
                const isCorrect =
                  optIndex === parseInt(fullQuestion.correctAnswer);
                const optionLetter = String.fromCharCode(65 + optIndex);

                const optionColor = isCorrect ? "#16a34a" : "#4b5563";
                const optionPrefix = isCorrect ? "✓" : " ";

                doc
                  .fillColor(optionColor)
                  .text(`   ${optionPrefix} ${optionLetter}. ${option}`, {
                    indent: 35,
                    width: doc.page.width - 150,
                    lineGap: 2, // Better line spacing for options
                  });

                doc.moveDown(0.5); // Increased spacing between options
              });

              doc.moveDown(0.3); // Extra space after options
            } else if (fullQuestion.questionType === "single") {
              // Single answer
              doc
                .fontSize(11)
                .fillColor("#16a34a")
                .text(`   ✓ Answer: ${fullQuestion.correctAnswer}`, {
                  indent: 30,
                });
              doc.moveDown(0.3);
            }

            doc.moveDown(1);

            // Separator line
            doc
              .moveTo(50, doc.y)
              .lineTo(doc.page.width - 50, doc.y)
              .strokeColor("#e5e7eb")
              .stroke();

            doc.moveDown(1);
          });

          addFooter();
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new PDFService();
