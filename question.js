/* ==========================================================================
   question.js
   - QUESTION_BANK: ngân hàng câu hỏi gốc (thứ tự đáp án cố định, `correct` là chỉ số đáp án đúng)
   - Logic trộn ngẫu nhiên: trộn thứ tự câu hỏi và thứ tự đáp án mỗi lần chơi

   Muốn thêm câu hỏi: chỉ cần thêm một object vào QUESTION_BANK theo cùng định dạng.
   ========================================================================== */

const QUESTION_BANK = [
    {
        question: "Trái Đất có tổng cộng bao nhiêu đại dương chính thức?",
        options: ["3 đại dương", "4 đại dương", "5 đại dương", "6 đại dương"],
        correct: 2,
        explanation: "Trái Đất có 5 đại dương: Thái Bình Dương, Đại Tây Dương, Ấn Độ Dương, Bắc Băng Dương và Nam Băng Dương."
    },
    {
        question: "Hành tinh nào trong Hệ Mặt Trời nằm ở vị trí gần Mặt Trời nhất?",
        options: ["Sao Kim (Venus)", "Sao Thủy (Mercury)", "Sao Hỏa (Mars)", "Sao Mộc (Jupiter)"],
        correct: 1,
        explanation: "Sao Thủy là hành tinh nhỏ nhất và nằm gần Mặt Trời nhất."
    },
    {
        question: "Quốc gia nào có diện tích lãnh thổ lớn nhất thế giới?",
        options: ["Trung Quốc", "Mỹ", "Canada", "Nga"],
        correct: 3,
        explanation: "Nga là quốc gia lớn nhất thế giới với diện tích hơn 17 triệu km²."
    },
    {
        question: "Cột mốc số 0km nổi tiếng của Việt Nam nằm tại tỉnh nào?",
        options: ["Hà Giang", "Lào Cai", "Cao Bằng", "Điện Biên"],
        correct: 0,
        explanation: "Cột mốc số 0 nằm ở trung tâm thành phố Hà Giang, tỉnh Hà Giang."
    },
    {
        question: "Trong các kim loại sau, kim loại nào dẫn điện tốt nhất ở điều kiện thường?",
        options: ["Đồng (Cu)", "Vàng (Au)", "Bạc (Ag)", "Nhôm (Al)"],
        correct: 2,
        explanation: "Bạc (Ag) là kim loại có tính dẫn điện tốt nhất, tiếp theo là Đồng (Cu) và Vàng (Au)."
    },
    {
        question: "Đỉnh núi nào được mệnh danh là 'Nóc nhà Đông Dương'?",
        options: ["Đỉnh Tây Côn Lĩnh", "Đỉnh Fansipan", "Đỉnh Mẫu Sơn", "Đỉnh Langbiang"],
        correct: 1,
        explanation: "Fansipan cao 3.143m thuộc dãy Hoàng Liên Sơn là đỉnh núi cao nhất Đông Dương."
    },
    {
        question: "Quốc gia nào được mệnh danh là 'Xứ sở Mặt Trời mọc'?",
        options: ["Hàn Quốc", "Thái Lan", "Nhật Bản", "Trung Quốc"],
        correct: 2,
        explanation: "Nhật Bản trong tiếng Hán (Nippon/Nihon) có nghĩa là 'gốc của Mặt Trời'."
    },
    {
        question: "Bánh Chưng truyền thống của Việt Nam được gói chủ yếu bằng loại lá nào?",
        options: ["Lá chuối", "Lá sen", "Lá dừa", "Lá dong"],
        correct: 3,
        explanation: "Lá dong mang lại màu xanh tươi và hương vị đặc trưng cho bánh chưng."
    },
    {
        question: "Trong bảng tuần hoàn hóa học, ký hiệu hóa học của Vàng là gì?",
        options: ["Au", "Ag", "Fe", "Cu"],
        correct: 0,
        explanation: "Ký hiệu Au xuất phát từ từ tiếng Latinh 'Aurum' có nghĩa là bình minh rực rỡ."
    },
    {
        question: "Trong 12 con giáp truyền thống Việt Nam, con vật nào đứng ở vị trí thứ 4?",
        options: ["Con Thỏ", "Con Mèo (Mão)", "Con Dê (Mùi)", "Con Trâu (Sửu)"],
        correct: 1,
        explanation: "Thứ tự 12 con giáp VN: Tý, Sửu, Dần, Mão (Mèo), Thìn, Tỵ, Ngọ, Mùi, Thân, Dậu, Tuất, Hợi."
    }
];

/* --------------------------------------------------------------------------
   Logic trộn ngẫu nhiên
   -------------------------------------------------------------------------- */

/**
 * Trộn mảng bằng thuật toán Fisher-Yates.
 * Trả về mảng MỚI, không làm thay đổi mảng gốc.
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Trộn thứ tự đáp án của một câu hỏi và tính lại chỉ số đáp án đúng.
 * Trả về bản sao của câu hỏi, không làm thay đổi câu hỏi gốc.
 */
function shuffleQuestionOptions(q) {
    // Trộn các chỉ số [0, 1, 2, 3] rồi sắp lại đáp án theo thứ tự mới
    const newOrder = shuffleArray(q.options.map((_, index) => index));

    return {
        ...q,
        options: newOrder.map(oldIndex => q.options[oldIndex]),
        // Vị trí mới của đáp án đúng chính là vị trí của chỉ số cũ trong thứ tự mới
        correct: newOrder.indexOf(q.correct)
    };
}

/**
 * Tạo bộ câu hỏi cho một lượt chơi:
 * trộn thứ tự câu hỏi, lấy `count` câu đầu tiên, rồi trộn đáp án từng câu.
 *
 * @param {number} count Số câu muốn lấy (mặc định: toàn bộ ngân hàng câu hỏi)
 */
function getShuffledQuestions(count = QUESTION_BANK.length) {
    return shuffleArray(QUESTION_BANK)
        .slice(0, count)
        .map(shuffleQuestionOptions);
}
