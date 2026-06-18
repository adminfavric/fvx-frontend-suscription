import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  isLoaded = false;
  isMobile = false;
  videoReady = false;

  desktopVideos = [
    'assets/videobanner/0503-720.mp4',
    'assets/videobanner/0506-720.mp4',
    'assets/videobanner/0507-720.mp4'
  ];

  mobileVideos = [
    'assets/videobanner/0503-480.mp4',
    'assets/videobanner/0506-480.mp4',
    'assets/videobanner/0507-480.mp4'
  ];

  currentVideoIndex = 0;
  private videoEndedListener: (() => void) | null = null;
  private videoPlayingListener: (() => void) | null = null;
  private videoErrorListener: (() => void) | null = null;
  private fallbackTimeout: any = null;

  constructor(private popupService: PopupService) {
    this.checkIfMobile();
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.checkIfMobile();
    if (wasMobile !== this.isMobile && this.videoPlayer) {
      this.currentVideoIndex = 0;
      this.videoReady = false;
      this.loadVideo();
    }
  }

  ngAfterViewInit(): void {
    this.setupVideoPlayer();
    this.loadVideo();
    setTimeout(() => {
      this.isLoaded = true;
    }, 300);
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
    }
  }

  private checkIfMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  private setupVideoPlayer(): void {
    if (!this.videoPlayer) return;

    const video = this.videoPlayer.nativeElement;

    // Cuando el video REALMENTE empieza a reproducirse
    this.videoPlayingListener = () => {
      this.videoReady = true;
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }
    };

    // Cuando termina el video → siguiente
    this.videoEndedListener = () => {
      this.playNextVideo();
    };

    // Si hay error → siguiente video
    this.videoErrorListener = () => {
      console.warn('Error cargando video, pasando al siguiente...');
      this.playNextVideo();
    };

    video.addEventListener('playing', this.videoPlayingListener);
    video.addEventListener('ended', this.videoEndedListener);
    video.addEventListener('error', this.videoErrorListener);
  }

  private removeEventListeners(): void {
    if (!this.videoPlayer) return;
    const video = this.videoPlayer.nativeElement;

    if (this.videoPlayingListener) {
      video.removeEventListener('playing', this.videoPlayingListener);
    }
    if (this.videoEndedListener) {
      video.removeEventListener('ended', this.videoEndedListener);
    }
    if (this.videoErrorListener) {
      video.removeEventListener('error', this.videoErrorListener);
    }
  }

  private playNextVideo(): void {
    const videos = this.isMobile ? this.mobileVideos : this.desktopVideos;
    this.currentVideoIndex = (this.currentVideoIndex + 1) % videos.length;
    this.videoReady = false;
    this.loadVideo();
  }

  private loadVideo(): void {
    if (!this.videoPlayer) return;

    const video = this.videoPlayer.nativeElement;
    const videos = this.isMobile ? this.mobileVideos : this.desktopVideos;
    const currentVideo = videos[this.currentVideoIndex];

    video.src = currentVideo;
    video.muted = true;
    video.load();

    // Intentar reproducir después de un breve delay para asegurar que esté cargado
    setTimeout(() => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay bloqueado:', err);
        });
      }
    }, 100);

    // Timeout de seguridad: si después de 3 segundos el video no está reproduciendo,
    // ocultar la imagen de todas formas para no bloquear la vista
    this.fallbackTimeout = setTimeout(() => {
      if (!this.videoReady) {
        this.videoReady = true;
      }
    }, 3000);
  }

  openPrograms(): void {
    this.popupService.openPrograms();
  }
}
