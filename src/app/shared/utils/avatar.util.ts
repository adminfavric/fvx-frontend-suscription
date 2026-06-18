/**
 * Utilidad para generar avatares por defecto
 * Crea avatares con iniciales y colores únicos basados en el nombre
 */

export class AvatarUtil {
  /**
   * Genera las iniciales de un nombre completo
   * @param name Nombre completo
   * @returns Iniciales (máximo 2 caracteres)
   */
  static getInitials(name: string): string {
    if (!name) return '?';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    // Primera letra del primer nombre + primera letra del apellido
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Paleta de colores para avatares por hash (sin gradientes).
   */
  private static readonly AVATAR_HASH_COLORS = [
    '#3b82f6', // Azul
    '#64748b', // Gris profesional
    '#10b981', // Verde
    '#f59e0b', // Amarillo cálido
    '#0ea5e9', // Azul cielo
    '#6b7280', // Gris neutro
    '#14b8a6', // Verde agua
    '#f97316', // Naranja suave
  ];

  /**
   * Genera un color único basado en un string (nombre)
   * Usa hash para seleccionar de la paleta
   * @param str String base para generar el color
   * @returns Color en formato HEX
   */
  static getColorFromString(str: string): string {
    if (!str) return this.AVATAR_HASH_COLORS[0];
    
    // Hash simple del string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Seleccionar color de la paleta basado en el hash
    const index = Math.abs(hash) % this.AVATAR_HASH_COLORS.length;
    return this.AVATAR_HASH_COLORS[index];
  }

  /**
   * Genera un gradiente único basado en un string
   * @param str String base para generar el gradiente
   * @returns CSS gradient string
   */
  static getGradientFromString(str: string): string {
    if (!str) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    const color1 = this.getColorFromString(str);
    const color2 = this.getColorFromString(str + 'secondary');
    
    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  }

  /**
   * Genera un avatar SVG con iniciales (color sólido, sin gradiente)
   * @param name Nombre completo
   * @param size Tamaño del avatar en píxeles
   * @returns Data URL del SVG
   */
  static generateAvatarSvg(name: string, size = 120): string {
    const initials = this.getInitials(name);
    const color = this.getColorFromString(name);
    
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}" />
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          dy=".35em" 
          font-family="Inter, sans-serif" 
          font-size="${size * 0.4}" 
          font-weight="600" 
          fill="white"
        >${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Genera un hash numérico simple de un string
   * @param str String a hashear
   * @returns Número hash
   */
  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  /**
   * Colores predefinidos para tipos de entidades
   */
  static readonly ENTITY_COLORS = {
    user: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    client: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    /** Ejemplos de tipos de registro (plantilla genérica). */
    record: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    facility: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    caseFile: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  };

  /**
   * Iconos predefinidos para tipos de entidades (ligatures Material).
   */
  static readonly ENTITY_ICONS = {
    user: 'person',
    client: 'account_circle',
    record: 'description',
    facility: 'apartment',
    caseFile: 'assignment',
  };
}
