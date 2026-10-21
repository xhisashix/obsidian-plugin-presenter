export interface ExportScriptParams {
	totalSlides: number;
	baseWidth: number;
	baseHeight: number;
	slidesData: Array<{ index: number; notesHtml: string }>;
}

/**
 * Returns the interactive client runtime JavaScript for the standalone presentation HTML export.
 */
export function getExportScript(params: ExportScriptParams): string {
	const { totalSlides, baseWidth, baseHeight, slidesData } = params;

	return `
		(function() {
			const total = ${totalSlides};
			let currentIndex = 0;
			let isNotesOpen = false;

			const slidesData = ${JSON.stringify(slidesData)};

			// DOM Elements
			const presentationMode = document.getElementById('presentation-mode');
			const handoutMode = document.getElementById('handout-mode');
			const btnModePresentation = document.getElementById('btn-mode-presentation');
			const btnModeHandout = document.getElementById('btn-mode-handout');
			const btnToggleNotes = document.getElementById('btn-toggle-notes');
			const btnPrint = document.getElementById('btn-print');
			const btnPrev = document.getElementById('btn-prev');
			const btnNext = document.getElementById('btn-next');
			const btnFullscreen = document.getElementById('btn-fullscreen');
			const counterEl = document.getElementById('slide-counter');
			const progressBar = document.getElementById('progress-bar');
			const notesDrawer = document.getElementById('notes-drawer');
			const notesContent = document.getElementById('notes-content');
			const stageContainer = document.getElementById('stage-container');

			function showSlide(index) {
				if (index < 0 || index >= total) return;
				currentIndex = index;

				// Update active slide
				for (let i = 0; i < total; i++) {
					const card = document.getElementById('slide-' + i);
					if (card) {
						if (i === index) {
							card.classList.add('active');
						} else {
							card.classList.remove('active');
						}
					}
				}

				// Update counter & progress
				counterEl.textContent = (index + 1) + ' / ' + total;
				const progress = total > 1 ? ((index + 1) / total) * 100 : 100;
				progressBar.style.width = progress + '%';

				// Update notes content
				const noteData = slidesData[index];
				if (noteData && noteData.notesHtml && noteData.notesHtml.trim()) {
					notesContent.innerHTML = noteData.notesHtml;
					btnToggleNotes.style.color = '#38bdf8';
				} else {
					notesContent.innerHTML = '<span class="notes-empty">No notes for this slide.</span>';
					btnToggleNotes.style.color = '';
				}

				applyScale();
			}

			function nextSlide() {
				if (currentIndex < total - 1) showSlide(currentIndex + 1);
			}

			function prevSlide() {
				if (currentIndex > 0) showSlide(currentIndex - 1);
			}

			function toggleNotes() {
				isNotesOpen = !isNotesOpen;
				if (isNotesOpen) {
					notesDrawer.classList.remove('hidden');
					btnToggleNotes.classList.add('active');
				} else {
					notesDrawer.classList.add('hidden');
					btnToggleNotes.classList.remove('active');
				}
				setTimeout(applyScale, 50);
			}

			function setViewMode(mode) {
				if (mode === 'presentation') {
					presentationMode.style.display = 'flex';
					handoutMode.classList.add('hidden');
					btnModePresentation.classList.add('active');
					btnModeHandout.classList.remove('active');
					btnToggleNotes.style.display = '';
					applyScale();
				} else {
					presentationMode.style.display = 'none';
					handoutMode.classList.remove('hidden');
					btnModePresentation.classList.remove('active');
					btnModeHandout.classList.add('active');
					btnToggleNotes.style.display = 'none';
				}
			}

			function toggleFullscreen() {
				if (!document.fullscreenElement) {
					document.documentElement.requestFullscreen().catch(() => {});
				} else {
					document.exitFullscreen().catch(() => {});
				}
			}

			function applyScale() {
				const activeCard = document.querySelector('.slide-card.active');
				if (!activeCard || !stageContainer) return;

				const stageW = stageContainer.clientWidth - 40;
				const stageH = stageContainer.clientHeight - 40;
				const baseW = ${baseWidth};
				const baseH = ${baseHeight};

				const scaleX = stageW / baseW;
				const scaleY = stageH / baseH;
				const scale = Math.min(scaleX, scaleY, 1.5);

				activeCard.style.transform = 'scale(' + Math.max(scale, 0.2) + ')';
			}

			// Event Listeners
			btnPrev.addEventListener('click', prevSlide);
			btnNext.addEventListener('click', nextSlide);
			btnToggleNotes.addEventListener('click', toggleNotes);
			btnModePresentation.addEventListener('click', () => setViewMode('presentation'));
			btnModeHandout.addEventListener('click', () => setViewMode('handout'));
			btnFullscreen.addEventListener('click', toggleFullscreen);
			btnPrint.addEventListener('click', () => window.print());

			window.addEventListener('resize', applyScale);

			window.addEventListener('keydown', (e) => {
				if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

				switch(e.key) {
					case 'ArrowRight':
					case 'ArrowDown':
					case ' ':
					case 'PageDown':
					case 'l':
					case 'j':
						e.preventDefault();
						nextSlide();
						break;
					case 'ArrowLeft':
					case 'ArrowUp':
					case 'PageUp':
					case 'h':
					case 'k':
						e.preventDefault();
						prevSlide();
						break;
					case 'Home':
						e.preventDefault();
						showSlide(0);
						break;
					case 'End':
						e.preventDefault();
						showSlide(total - 1);
						break;
					case 'f':
					case 'F':
						e.preventDefault();
						toggleFullscreen();
						break;
					case 'n':
					case 'N':
						e.preventDefault();
						toggleNotes();
						break;
					case 'p':
					case 'P':
						if (!e.metaKey && !e.ctrlKey) {
							e.preventDefault();
							window.print();
						}
						break;
				}
			});

			// Initial Setup
			showSlide(0);
		})();
	`;
}
