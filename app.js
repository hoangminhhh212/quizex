/* ==========================================================================
   app.js
   Logic chính của trò chơi. Cần nạp SAU question.js vì dùng getShuffledQuestions().
   ========================================================================== */

const TIME_PER_QUESTION = 15;   // Số giây cho mỗi câu
const WIN_PERCENT = 70;         // Điểm phần trăm tối thiểu để thắng
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* --------------------------------------------------------------------------
   Âm thanh tổng hợp bằng Web Audio API (không cần file âm thanh ngoài)
   -------------------------------------------------------------------------- */
class SoundFX {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSelect() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playWinFanfare() {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.12);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + index * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + index * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + index * 0.12);
            osc.stop(this.ctx.currentTime + index * 0.12 + 0.3);
        });
    }
}

const audioFX = new SoundFX();

/* --------------------------------------------------------------------------
   Ứng dụng đố vui
   -------------------------------------------------------------------------- */
class QuizApp {
    constructor() {
        this.questions = [];            // Bộ câu hỏi đã trộn của lượt chơi hiện tại
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];          // Lịch sử trả lời {questionIndex, selected, correct}
        this.selectedOptionIndex = null;
        this.timerInterval = null;
        this.timeLeft = TIME_PER_QUESTION;

        // DOM Elements
        this.startScreen = document.getElementById('startScreen');
        this.quizScreen = document.getElementById('quizScreen');
        this.resultScreen = document.getElementById('resultScreen');
        this.questionText = document.getElementById('questionText');
        this.optionsContainer = document.getElementById('optionsContainer');
        this.questionCounterBadge = document.getElementById('questionCounterBadge');
        this.progressBar = document.getElementById('progressBar');
        this.timerText = document.getElementById('timerText');
        this.nextBtn = document.getElementById('nextBtn');
        this.rgbLedFrame = document.getElementById('rgbLedFrame');
    }

    startQuiz() {
        audioFX.playSelect();

        // Mỗi lượt chơi lấy một bộ câu hỏi mới đã được trộn ngẫu nhiên
        this.questions = getShuffledQuestions();
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];

        // Tắt hiệu ứng thắng của lượt trước
        this.rgbLedFrame.classList.remove('active');
        this.resultScreen.classList.remove('victory-glow');

        // Chuyển màn hình
        this.startScreen.classList.add('hidden');
        this.resultScreen.classList.add('hidden');
        this.quizScreen.classList.remove('hidden');

        this.loadQuestion();
    }

    loadQuestion() {
        this.selectedOptionIndex = null;
        this.disableNextButton();

        const q = this.questions[this.currentQuestionIndex];
        this.questionText.textContent = `${this.currentQuestionIndex + 1}. ${q.question}`;
        this.questionCounterBadge.textContent = `Câu ${this.currentQuestionIndex + 1}/${this.questions.length}`;

        // Cập nhật thanh tiến độ
        const progressPercent = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressBar.style.width = `${progressPercent}%`;

        // Hiển thị các đáp án dạng pill
        this.optionsContainer.innerHTML = '';

        q.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'pill-option w-full p-4 rounded-full text-left font-medium text-sm md:text-base text-slate-100 flex items-center justify-between group transition-all duration-300';

            btn.innerHTML = `
                <div class="flex items-center gap-3.5">
                    <span class="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-cyan-300 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                        ${OPTION_LABELS[index]}
                    </span>
                    <span>${optText}</span>
                </div>
                <div class="status-icon w-5 h-5 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
                </div>
            `;

            btn.onclick = () => this.selectOption(index, btn);
            this.optionsContainer.appendChild(btn);
        });

        this.startTimer();
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timeLeft = TIME_PER_QUESTION;
        this.timerText.textContent = `${this.timeLeft}s`;

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timerText.textContent = `${this.timeLeft}s`;

            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                // Hết giờ mà chưa chọn đáp án: ghi nhận là bỏ trống
                if (this.selectedOptionIndex === null) {
                    this.userAnswers.push({
                        questionIndex: this.currentQuestionIndex,
                        selected: -1, // Hết giờ
                        correct: this.questions[this.currentQuestionIndex].correct
                    });
                }
                this.nextQuestion();
            }
        }, 1000);
    }

    selectOption(index, optionBtn) {
        audioFX.playSelect();
        this.selectedOptionIndex = index;

        // Làm nổi bật đáp án được chọn
        const allButtons = this.optionsContainer.querySelectorAll('button');
        allButtons.forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('bg-cyan-500/30', 'border-cyan-400', 'shadow-lg');
                btn.classList.remove('bg-white/5');
                const icon = btn.querySelector('.status-icon');
                if (icon) icon.classList.add('opacity-100', 'bg-cyan-400');
            } else {
                btn.classList.remove('bg-cyan-500/30', 'border-cyan-400');
                btn.classList.add('opacity-60');
            }
        });

        this.enableNextButton();
    }

    enableNextButton() {
        this.nextBtn.disabled = false;
        this.nextBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-white/10', 'text-slate-400');
        this.nextBtn.classList.add('bg-gradient-to-r', 'from-cyan-500', 'to-blue-600', 'text-white', 'shadow-lg', 'hover:scale-105');
    }

    disableNextButton() {
        this.nextBtn.disabled = true;
        this.nextBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-white/10', 'text-slate-400');
        this.nextBtn.classList.remove('bg-gradient-to-r', 'from-cyan-500', 'to-blue-600', 'text-white', 'shadow-lg', 'hover:scale-105');
    }

    nextQuestion() {
        clearInterval(this.timerInterval);

        if (this.selectedOptionIndex !== null) {
            const correct = this.questions[this.currentQuestionIndex].correct;
            if (this.selectedOptionIndex === correct) this.score++;

            this.userAnswers.push({
                questionIndex: this.currentQuestionIndex,
                selected: this.selectedOptionIndex,
                correct: correct
            });
        }

        this.currentQuestionIndex++;

        if (this.currentQuestionIndex < this.questions.length) {
            this.loadQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.quizScreen.classList.add('hidden');
        this.resultScreen.classList.remove('hidden');

        const total = this.questions.length;
        const percentage = Math.round((this.score / total) * 100);
        document.getElementById('scorePercent').textContent = `${percentage}%`;
        document.getElementById('scoreFraction').textContent = `${this.score}/${total} Đúng`;
        document.getElementById('correctCount').textContent = this.score;
        document.getElementById('wrongCount').textContent = total - this.score;

        const resultTitle = document.getElementById('resultTitle');
        const resultSubtitle = document.getElementById('resultSubtitle');

        // Điều kiện thắng: đạt từ WIN_PERCENT% trở lên
        const isWin = percentage >= WIN_PERCENT;

        if (isWin) {
            resultTitle.textContent = "THẮNG LỚN! XUẤT SẮC!";
            resultSubtitle.textContent = "Bạn sở hữu vốn tri thức tuyệt vời. Hệ thống đã kích hoạt LED RGB viền màn hình!";

            // Bật viền LED RGB quanh màn hình
            this.rgbLedFrame.classList.add('active');
            this.resultScreen.classList.add('victory-glow');

            // Phát nhạc chiến thắng và bắn confetti
            audioFX.playWinFanfare();
            fireConfetti();
        } else {
            resultTitle.textContent = "Cố Gắng Hơn Nhé!";
            resultSubtitle.textContent = `Bạn cần đạt từ ${WIN_PERCENT}% trở lên để kích hoạt hiệu ứng chiến thắng RGB.`;
            this.resultScreen.classList.remove('victory-glow');
        }

        this.renderReview();
    }

    renderReview() {
        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = '';

        this.userAnswers.forEach((ans, idx) => {
            const q = this.questions[ans.questionIndex];
            const isRight = ans.selected === ans.correct;

            const item = document.createElement('div');
            item.className = `p-3 rounded-2xl border text-xs leading-relaxed transition-all ${
                isRight
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`;

            item.innerHTML = `
                <div class="font-bold mb-1 flex items-center justify-between">
                    <span>Câu ${idx + 1}: ${q.question}</span>
                    <span class="px-2 py-0.5 rounded-full ${isRight ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                        ${isRight ? 'Đúng' : 'Sai'}
                    </span>
                </div>
                <div class="text-slate-300">
                    <span>Đã chọn: <strong class="text-white">${ans.selected >= 0 ? OPTION_LABELS[ans.selected] + '. ' + q.options[ans.selected] : 'Hết giờ'}</strong></span>
                </div>
                ${!isRight ? `<div class="text-emerald-300 mt-0.5">Đáp án đúng: <strong>${OPTION_LABELS[q.correct]}. ${q.options[q.correct]}</strong></div>` : ''}
            `;
            reviewList.appendChild(item);
        });
    }

    restartQuiz() {
        this.startQuiz();
    }
}

/* --------------------------------------------------------------------------
   Confetti nhẹ khi chiến thắng
   -------------------------------------------------------------------------- */
function fireConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff66', '#a855f7'];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: Math.random() * 3 + 2,
            vx: (Math.random() - 0.5) * 2,
            rotation: Math.random() * 360,
            rSpeed: (Math.random() - 0.5) * 10
        });
    }

    let animationFrame;
    let duration = 0;

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y += p.vy;
            p.x += p.vx;
            p.rotation += p.rSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        duration++;
        if (duration < 180) { // ~3 giây
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationFrame);
        }
    }

    render();
}

// Cập nhật kích thước canvas confetti khi đổi kích thước cửa sổ
window.addEventListener('resize', () => {
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// Khởi tạo ứng dụng (index.html gọi quizApp.startQuiz() / nextQuestion() / restartQuiz() qua onclick)
const quizApp = new QuizApp();
