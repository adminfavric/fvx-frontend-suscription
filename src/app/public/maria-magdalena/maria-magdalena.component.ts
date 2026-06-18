import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChapterCardComponent } from '../components/chapter-card/chapter-card.component';
import { PhotoViewerDialogComponent } from './photo-viewer-dialog.component';
import { TrailerDialogComponent } from './trailer-dialog.component';
import { MaratonDialogComponent } from './maraton-dialog.component';
import { PopupService } from '../services/popup.service';

interface Chapter {
  number: number;
  title: string;
  subtitle: string;
  date: string;
}

interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

@Component({
  selector: 'app-maria-magdalena',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ChapterCardComponent],
  templateUrl: './maria-magdalena.component.html',
  styleUrl: './maria-magdalena.component.scss'
})
export class MariaMagdalenaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  isMobile = false;
  videoReady = false;

  desktopVideos = [
    'assets/videobanner2/0504_720.mp4',
    'assets/videobanner2/0505-720.mp4',
    'assets/videobanner2/0508-720.mp4',
    'assets/videobanner2/0509-720.mp4',
    'assets/videobanner2/0510-720.mp4',
    'assets/videobanner2/0511-720.mp4'
  ];

  mobileVideos = [
    'assets/videobanner2/0504_480.mp4',
    'assets/videobanner2/0505-480.mp4',
    'assets/videobanner2/0508-480.mp4',
    'assets/videobanner2/0509-480.mp4',
    'assets/videobanner2/0510-480.mp4',
    'assets/videobanner2/0511-480.mp4'
  ];

  currentVideoIndex = 0;
  private videoEndedListener: (() => void) | null = null;
  private videoPlayingListener: (() => void) | null = null;
  private videoErrorListener: (() => void) | null = null;
  private fallbackTimeout: any = null;

  chapters: Chapter[] = [
    { number: 1, title: 'La Reina Silenciada', subtitle: 'Estreno: Sábado Santo 4 de abril', date: '4 de abril' },
    { number: 2, title: 'El Éxodo Sagrado', subtitle: 'Estreno: 11 de abril', date: '11 de abril' },
    { number: 3, title: 'El Verdadero Grial', subtitle: 'Estreno: 18 de abril', date: '18 de abril' },
    { number: 4, title: 'El Legado de María Magdalena', subtitle: 'Estreno: 25 de abril', date: '25 de abril' }
  ];

  testimonials: Testimonial[] = [
    { name: 'José Antonio Soto', role: 'Médico Antroposófico', quote: 'Hay una suerte de asombro y perplejidad con esta Magdalena que surge. Que es un ser muy extraordinario y misterioso y que claramente cada día iremos sabiendo más de ella.' },
    { name: 'Kenita Larraín', role: 'Comunicadora y Numeróloga', quote: 'Un trabajo maravilloso de dignificar, de mostrar y expandir el amor, la sabiduría del Sagrado Femenino que María Magdalena representa.' },
    { name: 'Manuela Oyarzún', role: 'Dramaturga y Directora de teatro', quote: 'Vine sin saber nada de ella. Solo la versión que está aceptada en la historia oficial y fue muy sorprendente para mí. Un gran aporte en cuanto a información. Encuentro que la factura del documental está buenísima.' },
    { name: 'Mariana Kaplun', role: 'Artista Plástica y Rabina', quote: 'Amé el documental. Siento que junta la historia real con amor, con delicadeza y un mensaje profundo para entrar a María Magdalena.' }
  ];

  chapterCards = [
    {
      image: 'assets/caps/cap1.png',
      title: 'La Reina Silenciada',
      body: '¿Quién fue realmente María Magdalena? ¿Una pecadora redimida, una mujer poseída por demonios… o la esposa secreta de Jesús de Nazaret? Durante siglos, la Iglesia moldeó una imagen ambigua y sumisa de la figura femenina más cercana a Cristo, difuminando su rol protagónico en los primeros años del cristianismo. Pero ¿qué hay detrás del mito? ¿Por qué fue tan importante ocultarla?',
      chapterNumber: 1
    },
    {
      image: 'assets/caps/cap2.png',
      title: 'El éxodo sagrado',
      body: 'Tras la crucifixión de Jesús de Nazaret, María Magdalena emprende una huida silenciosa que cambiará el curso oculto de la historia. Protegida por José de Arimatea, primero encuentra refugio en Egipto, tierra de antiguos misterios y saberes esotéricos, para luego embarcarse en un viaje hacia el extremo occidental del mundo conocido: la Galia',
      chapterNumber: 2
    },
    {
      image: 'assets/caps/cap3.png',
      title: 'El verdadero Grial',
      body: 'Lita Donoso explora las pistas del Santo Grial entre manuscritos, castillos y claves ocultas en la iconografía europea, mientras dialoga con la escritora y politóloga argentina Marisa Ventura, una de las investigadoras más activas del llamado "sagrado femenino".',
      chapterNumber: 3
    },
    {
      image: 'assets/caps/cap4.png',
      title: 'El legado de María Magdalena',
      body: 'El mensaje de María Magdalena no solo sobrevivió a la persecución medieval: fue protegido durante siglos por manos invisibles, custodios silenciosos de una verdad que podía cambiar el destino del mundo. Entre ellos, destacan los Caballeros Templarios y el Priorato de Sion, dos órdenes envueltas en leyendas, conspiraciones y sacrificios',
      chapterNumber: 4
    }
  ];

  galleryPhotos = [
    'assets/mm-lanzamiento/28bd263-bda1-b45d-dc06-15e517dabc58_5f426703-972c-4506-a83c-a14211f8ff9f.jpeg',
    'assets/mm-lanzamiento/6b1d520-d1e-324-f577-110d7e78cf83_d4c81a53-6333-41fe-9da6-e324934df834.jpeg',
    'assets/mm-lanzamiento/e68737-cef-4257-7d4b-fe8f86f53c00_7bb7fb0c-87c2-43c5-9f82-17a278871693.jpeg',
    'assets/mm-lanzamiento/e7304f4-4c0f-f32-7d83-3c1f015b4c_1d1d6cd1-505d-4e32-983c-82360260d67e.jpeg'
  ];

  private dialog = inject(MatDialog);

  constructor(private popupService: PopupService) {
    this.checkIfMobile();
  }

  openPhotoPopup(photo: string, index: number): void {
    this.dialog.open(PhotoViewerDialogComponent, {
      data: { photo, index, total: this.galleryPhotos.length },
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'photo-viewer-panel'
    });
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

    this.videoPlayingListener = () => {
      this.videoReady = true;
      if (this.fallbackTimeout) {
        clearTimeout(this.fallbackTimeout);
        this.fallbackTimeout = null;
      }
    };

    this.videoEndedListener = () => {
      this.playNextVideo();
    };

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

    if (this.videoPlayingListener) video.removeEventListener('playing', this.videoPlayingListener);
    if (this.videoEndedListener) video.removeEventListener('ended', this.videoEndedListener);
    if (this.videoErrorListener) video.removeEventListener('error', this.videoErrorListener);
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
    video.src = videos[this.currentVideoIndex];
    video.muted = true;
    video.load();

    setTimeout(() => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay bloqueado:', err);
        });
      }
    }, 100);

    this.fallbackTimeout = setTimeout(() => {
      if (!this.videoReady) {
        this.videoReady = true;
      }
    }, 3000);
  }

  buyChapter(chapter: number): void {
    this.popupService.open({
      title: `Comprar Capítulo ${chapter}`,
      content: `Has seleccionado el Capítulo ${chapter}. Serás redirigido a la plataforma de pago.`,
      type: 'info'
    });
  }

  buyAll(): void {
    this.dialog.open(MaratonDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'maraton-dialog-panel',
      autoFocus: true
    });
  }

  openTrailer(): void {
    this.dialog.open(TrailerDialogComponent, {
      maxWidth: '90vw',
      width: '800px',
      panelClass: 'trailer-dialog-panel'
    });
  }
}
