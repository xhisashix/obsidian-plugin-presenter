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
			let isOverviewOpen = false;
			let currentMode = 'presentation';

			const slidesData = ${JSON.stringify(slidesData)};

			// DOM Elements
			const presentationMode = document.getElementById('presentation-mode');
			const handoutMode = document.getElementById('handout-mode');
			const btnModePresentation = document.getElementById('btn-mode-presentation');
			const btnModeHandout = document.getElementById('btn-mode-handout');
			const btnOverview = document.getElementById('btn-overview');
			const overviewModal = document.getElementById('overview-modal');
			const btnOverviewClose = document.getElementById('btn-overview-close');
			const overviewThumbs = document.querySelectorAll('.presenter-overview-thumb');
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

			function autoFitSlideCard(card) {
				if (!card) return;
				const bodyEl = card.querySelector('.presenter-slide-body');
				if (!bodyEl) return;
				bodyEl.style.removeProperty('--presenter-body-scale');
				bodyEl.classList.remove('is-autofitted', 'is-dense-scale', 'is-overflow-clamped');

				const scrollH = bodyEl.scrollHeight;
				const clientH = bodyEl.clientHeight;
				if (clientH <= 0 || scrollH <= clientH + 4) return;

				let scale = Math.max(0.70, Math.floor((clientH / scrollH) * 100) / 100);
				bodyEl.style.setProperty('--presenter-body-scale', String(scale));
				bodyEl.classList.add('is-autofitted');
				if (scale <= 0.82) bodyEl.classList.add('is-dense-scale');

				let steps = 0;
				while (bodyEl.scrollHeight > bodyEl.clientHeight + 4 && scale > 0.70 && steps < 8) {
					scale = Math.max(0.70, Math.round((scale - 0.03) * 100) / 100);
					bodyEl.style.setProperty('--presenter-body-scale', String(scale));
					steps++;
				}
				if (bodyEl.scrollHeight > bodyEl.clientHeight + 4) {
					bodyEl.classList.add('is-overflow-clamped');
				}
			}

			function showSlide(index) {
				if (index < 0 || index >= total) return;
				currentIndex = index;

				let activeCard = null;
				// Update active slide
				for (let i = 0; i < total; i++) {
					const card = document.getElementById('slide-' + i);
					if (card) {
						if (i === index) {
							card.classList.add('active');
							activeCard = card;
						} else {
							card.classList.remove('active');
						}
					}

					const thumb = document.getElementById('overview-thumb-' + i);
					if (thumb) {
						if (i === index) {
							thumb.classList.add('is-active');
						} else {
							thumb.classList.remove('is-active');
						}
					}
				}

				if (activeCard) {
					autoFitSlideCard(activeCard);
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

			function openOverview() {
				if (!overviewModal) return;
				isOverviewOpen = true;
				overviewModal.classList.remove('hidden');
				if (btnOverview) btnOverview.classList.add('active');
			}

			function closeOverview() {
				if (!overviewModal) return;
				isOverviewOpen = false;
				overviewModal.classList.add('hidden');
				if (btnOverview) btnOverview.classList.remove('active');
			}

			function toggleOverview() {
				if (isOverviewOpen) {
					closeOverview();
				} else {
					openOverview();
				}
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
				currentMode = mode;
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

			function updateHandoutTocActive(activeIdx) {
				document.querySelectorAll('.handout-toc-link, .handout-toc-section-link').forEach(function(el) {
					if (el.getAttribute('data-index') === String(activeIdx)) {
						el.classList.add('is-active');
					} else {
						el.classList.remove('is-active');
					}
				});
			}

			// Handout TOC click & scroll handler
			document.querySelectorAll('.handout-toc-link, .handout-toc-section-link').forEach(function(link) {
				link.addEventListener('click', function(e) {
					e.preventDefault();
					const targetIndex = link.getAttribute('data-index');
					if (targetIndex !== null) {
						const targetEl = document.getElementById('handout-item-' + targetIndex);
						if (targetEl) {
							targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
							updateHandoutTocActive(targetIndex);
						}
					}
				});
			});

			// Handout scrollspy using IntersectionObserver
			if ('IntersectionObserver' in window && handoutMode) {
				const tocObserver = new IntersectionObserver(function(entries) {
					entries.forEach(function(entry) {
						if (entry.isIntersecting) {
							const id = entry.target.id;
							if (id && id.indexOf('handout-item-') === 0) {
								const idx = id.substring('handout-item-'.length);
								updateHandoutTocActive(idx);
							}
						}
					});
				}, { root: handoutMode, threshold: 0.25 });

				document.querySelectorAll('.handout-item').forEach(function(item) {
					tocObserver.observe(item);
				});
			}

			// Event Listeners
			btnPrev.addEventListener('click', prevSlide);
			btnNext.addEventListener('click', nextSlide);
			btnToggleNotes.addEventListener('click', toggleNotes);
			if (btnOverview) btnOverview.addEventListener('click', toggleOverview);
			if (btnOverviewClose) btnOverviewClose.addEventListener('click', closeOverview);
			if (overviewModal) {
				overviewModal.addEventListener('click', function(e) {
					if (e.target === overviewModal) {
						closeOverview();
					}
				});
			}

			overviewThumbs.forEach(function(thumb) {
				thumb.addEventListener('click', function() {
					const targetIndex = parseInt(thumb.getAttribute('data-index') || '0', 10);
					closeOverview();
					if (currentMode === 'handout') {
						const targetEl = document.getElementById('handout-item-' + targetIndex);
						if (targetEl) {
							targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
						}
					} else {
						showSlide(targetIndex);
					}
				});
			});

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
					case 'g':
					case 'G':
					case 'o':
					case 'O':
						e.preventDefault();
						toggleOverview();
						break;
					case 'Escape':
						if (isOverviewOpen) {
							e.preventDefault();
							closeOverview();
						}
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
