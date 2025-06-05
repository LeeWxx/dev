// 마크다운 메타데이터 타입
export interface PostMeta {
  title: string;
  date: string;
  description: string;
  tags?: string[];
  thumbnail?: string;
}

// 기본 게시물 타입
export interface PostData extends PostMeta {
  id: string;
}

// 게시물 상세 정보 타입
export interface PostDetail extends PostData {
  contentHtml: string;
} 