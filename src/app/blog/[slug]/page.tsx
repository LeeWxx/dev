import { getPostData } from "@/lib/posts";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

interface PostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const post = await getPostData(resolvedParams.slug);
    return {
      title: post.title,
      description: post.description || "블로그 게시물",
    };
  } catch {
    return {
      title: "게시물을 찾을 수 없습니다",
      description: "요청한 게시물을 찾을 수 없습니다.",
    };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  try {
    const resolvedParams = await params;
    const post = await getPostData(resolvedParams.slug);

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/blog"
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        <article className="prose prose-invert lg:prose-xl max-w-none">
          <div className="text-4xl font-bold mb-4">{post.title}</div>
          <div className="flex items-center gap-4 mb-8 text-gray-400">
            <time dateTime={post.date}>{post.date}</time>
            {post.tags && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-800 text-gray-200 px-2 py-1 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {post.description && (
            <p className="text-xl text-gray-300 mb-8">{post.description}</p>
          )}
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>
      </div>
    );
  } catch {
    notFound();
  }
}
