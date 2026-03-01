import { Spinner } from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}
