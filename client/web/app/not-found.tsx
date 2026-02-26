import { NotFound } from "@/components/core/common/notfound";

export default function NotFoundPage( { params }: { params: { slug: string } } ) {
    return <NotFound params={params} />;
}
