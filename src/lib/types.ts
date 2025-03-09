export type RegionMode = 'visited' | 'planned' | 'banned' | 'none';

export interface ListColors {
    visited: ColorStyles;
    planned: ColorStyles;
    banned: ColorStyles;
    none: ColorStyles;
}

export interface ColorStyles {
    text: string;
    background: string;
}