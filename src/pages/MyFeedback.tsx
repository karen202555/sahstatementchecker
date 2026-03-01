import Header from "@/components/Header";
import MyFeedbackList from "@/components/feedback-kit/MyFeedbackList";

const MyFeedback = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">My Feedback</h1>
      <MyFeedbackList />
    </main>
  </div>
);

export default MyFeedback;
