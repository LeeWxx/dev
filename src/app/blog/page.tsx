import { PostsView } from '@/components/posts-view'
import { getSortedPostsData } from '@/lib/posts'
import { PostData } from '@/types'

export default async function BlogPage() {
  const postsData : PostData[] = getSortedPostsData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <PostsView
          posts={postsData} 
        />
      </div>
    </div>
  )
}