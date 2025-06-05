import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PostData, PostMeta, PostDetail } from '@/types';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

export function getSortedPostsData(): PostData[] {
  // 포스트 데이터 가져오기
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      // 파일 이름을 id로 사용
      const id = fileName.replace(/\.md$/, '');

      // 마크다운 파일을 문자열로 읽기
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // 포스트 메타데이터 파싱
      const matterResult = matter(fileContents);
      const meta = matterResult.data as PostMeta;

      return {
        id,
        ...meta,
      };
    });

  // 날짜별로 정렬
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getPostData(id: string): Promise<PostDetail> {
  const fullPath = path.join(postsDirectory, `${id}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // 포스트 메타데이터 파싱
  const matterResult = matter(fileContents);
  const meta = matterResult.data as PostMeta;

  const contentHtml = matterResult.content.toString();

  return {
    id,
    contentHtml,
    ...meta,
  };
} 