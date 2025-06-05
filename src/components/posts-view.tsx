'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PostData } from '@/types'

interface PostsViewProps {
  posts: PostData[] 
}

export function PostsView({ posts }: PostsViewProps) {
  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {posts.length}개의 포스트
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="block transition-colors hover:opacity-90"
            >
              <Card className="h-full overflow-hidden border-0 shadow-sm hover:shadow">
                {post.thumbnail && (
                  <div className="relative h-40 w-full">
                    <Image
                      src={post.thumbnail}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 mb-2">
                    {post.tags && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {post.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">{post.title}</h3>
                  {post.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {post.description}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 