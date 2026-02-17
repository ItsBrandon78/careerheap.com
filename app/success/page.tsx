import Link from 'next/link';
import Button from '@/components/Button';

export default function SuccessPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Pro</h1>
        <p className="text-gray-600 mb-8">
          Your subscription has been activated. You now have unlimited access to all CareerHeap tools!
        </p>

        <div className="space-y-4">
          <Link href="/tools" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Start Using Tools
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" size="lg" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> You can manage your subscription anytime in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
