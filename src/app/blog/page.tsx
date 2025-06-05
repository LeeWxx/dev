import { PostsView } from '@/components/posts-view'

export default async function BlogPage() {
  // 임시 데이터
  const posts = [
    {
      slug: 'post-1',
      title: '타이틀1',
      desc: '설명1',
      category: '카테고리1',
      dateString: '2025-06-05',
      thumbnail: '/images/placeholder.jpg',
    },
    {
      slug: 'post-2',
      title: '타이틀2',
      desc: '설명2',
      category: '카테고리2',
      dateString: '2025-06-05',
      thumbnail: '/images/placeholder.jpg',
    },
    {
      slug: 'post-3',
      title: '타이틀3',
      desc: '설명3',
      category: '카테고리3',
      dateString: '2025-06-05',
      thumbnail: '/images/placeholder.jpg',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        
        <PostsView
          posts={posts} 
        />
      </div>
    </div>
  )
}