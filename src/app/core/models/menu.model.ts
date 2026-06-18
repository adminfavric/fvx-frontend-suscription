/** DRF ``GET /api/v1/menus/tree/`` payload (menu + sections; items filtered by role on the server). */

export interface MenuMetadataDto {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  is_default: boolean;
}

export interface MenuItemDto {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  route: string;
  icon: string;
  order: number;
  allowed_roles: string[];
}

export interface MenuSectionDto {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  order: number;
  items: MenuItemDto[];
}

export interface MenuResponse {
  menu: MenuMetadataDto | null;
  sections: MenuSectionDto[];
}
