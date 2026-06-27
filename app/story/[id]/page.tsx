import { Editor } from "@/components/Editor";

export default function StoryEditorPage({ params }: { params: { id: string } }) {
  return <Editor storyId={params.id} />;
}
