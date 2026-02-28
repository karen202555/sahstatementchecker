import PublicLayout from "@/components/PublicLayout";

const About = () => (
  <PublicLayout>
    <h1 className="text-2xl font-bold text-foreground mb-6">About Statement Checker</h1>
    <div className="space-y-4 text-base text-muted-foreground leading-relaxed max-w-[800px]">
      <p>
        The November statements finally arrived in February, and Dad's first question was:
      </p>
      <p className="italic text-foreground font-medium">"What day was the 6th?"</p>
      <p>
        He was trying to work out what services had actually happened. I realised that was going to be a very common question, so I built a small tool to convert provider statements into a calendar view. Seeing the transactions by day made it much easier to spot patterns and discrepancies.
      </p>
      <p>But then I got a bit carried away.</p>
      <p>
        As I looked more closely, I started using AI to analyse the statements and check for anomalies. It quickly became clear how inconsistent provider statements are and how difficult it is for participants to understand where their funding is going. Disputing problems meant working through statements line by line and writing endless emails, which is how Statement Checker really began.
      </p>
      <p>
        My background is in accounting and financial systems. I started my career as an accountant before moving into accounting software and large system implementations, later working in development teams and managing support within one of Australia's largest software companies.
      </p>
      <p>
        Before building Statement Checker I had already begun developing practical apps for artists. I am now developing more tools aimed at helping older people and their families better understand and manage their services, so there is more to come.
      </p>
      <p>
        Statement Checker exists to help participants understand their statements, identify discrepancies, and take control of their funding.
      </p>
    </div>
  </PublicLayout>
);

export default About;
