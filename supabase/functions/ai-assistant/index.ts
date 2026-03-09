import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "رصدة AI" - المساعد الذكي لنظام رصدة لإدارة الجودة في قطاع المطاعم.

## قدراتك:
1. **عرض وتحليل التقييمات**: استعراض التقييمات السابقة، تلخيصها، ومقارنة أداء الفروع
2. **إدارة المهام**: إنشاء مهام جديدة، تحديث حالتها، وتعيينها لموظفين
3. **إدارة الملاحظات**: عرض الملاحظات المفتوحة (عدم المطابقة)، تحليلها، واقتراح إجراءات تصحيحية
4. **التحليلات والتوصيات**: تحليل الأداء العام وتقديم توصيات لتحسين الجودة
5. **الإجابة على الأسئلة**: الرد على أي استفسار عن النظام أو عمليات الجودة

## قواعد مهمة:
- أجب دائماً باللغة العربية إلا إذا طلب المستخدم غير ذلك
- كن موجزاً ومفيداً
- عند عرض البيانات، نسقها بشكل واضح
- قدم توصيات عملية مبنية على البيانات
- استخدم الأدوات المتاحة لجلب البيانات الحقيقية قبل الإجابة
- لا تخترع بيانات - استخدم الأدوات دائماً

## نظام التقييم:
- الدرجات من 0 إلى 5
- ممتاز: 5 | جيد: 4 | متوسط: 3 | ضعيف: 0-2
- النسبة المئوية = (المجموع / الحد الأقصى) × 100`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_evaluations",
      description:
        "Get evaluations list with optional filters. Returns evaluation data including branch, score, status, and date.",
      parameters: {
        type: "object",
        properties: {
          branch_id: { type: "string", description: "Filter by branch ID" },
          status: {
            type: "string",
            enum: ["draft", "submitted", "approved"],
            description: "Filter by status",
          },
          limit: {
            type: "number",
            description: "Max results (default 10)",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_branches",
      description: "Get list of branches with their details",
      parameters: {
        type: "object",
        properties: {
          is_active: { type: "boolean", description: "Filter active/inactive" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_findings",
      description:
        "Get non-conformities (findings) with optional filters. Returns finding details including branch, criterion, score, and status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: [
              "open",
              "in_progress",
              "pending_review",
              "resolved",
              "rejected",
            ],
            description: "Filter by status",
          },
          branch_id: { type: "string", description: "Filter by branch ID" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "Get operations tasks with optional filters",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed"],
            description: "Filter by status",
          },
          branch_id: { type: "string", description: "Filter by branch ID" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new operations task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority",
          },
          branch_id: { type: "string", description: "Branch ID" },
          due_date: {
            type: "string",
            description: "Due date in YYYY-MM-DD format",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Update the status of an operations task",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID to update" },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed"],
            description: "New status",
          },
        },
        required: ["task_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_branch_performance",
      description:
        "Get performance summary for a branch or all branches, including average scores and evaluation counts",
      parameters: {
        type: "object",
        properties: {
          branch_id: {
            type: "string",
            description: "Specific branch ID, or omit for all branches",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finding_stats",
      description:
        "Get statistics about findings (non-conformities) - counts by status",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

async function executeTool(
  supabaseClient: ReturnType<typeof createClient>,
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "get_evaluations": {
        let query = supabaseClient
          .from("evaluations")
          .select(
            "id, status, overall_score, overall_percentage, period_type, created_at, submitted_at, notes, branch_id, branches(name, name_ar)"
          )
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 10);

        if (args.branch_id) query = query.eq("branch_id", args.branch_id);
        if (args.status) query = query.eq("status", args.status);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }

      case "get_branches": {
        let query = supabaseClient
          .from("branches")
          .select("id, name, name_ar, city, is_active, region_id")
          .order("name");

        if (args.is_active !== undefined)
          query = query.eq("is_active", args.is_active);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }

      case "get_findings": {
        let query = supabaseClient
          .from("non_conformities")
          .select(
            "id, status, score, max_score, assessor_notes, due_date, created_at, branch_id, branches(name, name_ar), criterion_id, template_criteria(name, name_ar)"
          )
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 20);

        if (args.status) query = query.eq("status", args.status);
        if (args.branch_id) query = query.eq("branch_id", args.branch_id);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }

      case "get_tasks": {
        let query = supabaseClient
          .from("operations_tasks")
          .select(
            "id, title, description, status, priority, due_date, created_at, branch_id, branches(name, name_ar)"
          )
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 20);

        if (args.status) query = query.eq("status", args.status);
        if (args.branch_id) query = query.eq("branch_id", args.branch_id);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }

      case "create_task": {
        const { data, error } = await supabaseClient
          .from("operations_tasks")
          .insert({
            title: args.title as string,
            description: (args.description as string) || null,
            priority: (args.priority as string) || "medium",
            branch_id: (args.branch_id as string) || null,
            due_date: (args.due_date as string) || null,
            created_by: userId,
          })
          .select()
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, task: data });
      }

      case "update_task_status": {
        const updateData: Record<string, unknown> = {
          status: args.status,
        };
        if (args.status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabaseClient
          .from("operations_tasks")
          .update(updateData)
          .eq("id", args.task_id as string)
          .select()
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, task: data });
      }

      case "get_branch_performance": {
        let query = supabaseClient
          .from("evaluations")
          .select(
            "id, overall_percentage, overall_score, branch_id, branches(name, name_ar), status, created_at"
          )
          .eq("status", "submitted")
          .order("created_at", { ascending: false });

        if (args.branch_id) query = query.eq("branch_id", args.branch_id);

        const { data, error } = await query.limit(100);
        if (error) return JSON.stringify({ error: error.message });

        // Aggregate by branch
        const branchMap: Record<
          string,
          {
            name: string;
            name_ar: string;
            count: number;
            totalPercentage: number;
            latest: number | null;
          }
        > = {};
        for (const ev of data || []) {
          const bid = ev.branch_id;
          if (!branchMap[bid]) {
            branchMap[bid] = {
              name: (ev.branches as any)?.name || "",
              name_ar: (ev.branches as any)?.name_ar || "",
              count: 0,
              totalPercentage: 0,
              latest: null,
            };
          }
          branchMap[bid].count++;
          branchMap[bid].totalPercentage += ev.overall_percentage || 0;
          if (!branchMap[bid].latest)
            branchMap[bid].latest = ev.overall_percentage;
        }

        const result = Object.entries(branchMap).map(([id, b]) => ({
          branch_id: id,
          branch_name: b.name,
          branch_name_ar: b.name_ar,
          evaluation_count: b.count,
          average_percentage: Math.round(b.totalPercentage / b.count),
          latest_percentage: b.latest,
        }));

        return JSON.stringify(result);
      }

      case "get_finding_stats": {
        const { data, error } = await supabaseClient
          .from("non_conformities")
          .select("status");

        if (error) return JSON.stringify({ error: error.message });

        const stats: Record<string, number> = {
          open: 0,
          in_progress: 0,
          pending_review: 0,
          resolved: 0,
          rejected: 0,
        };
        for (const f of data || []) {
          stats[f.status] = (stats[f.status] || 0) + 1;
        }
        stats.total = data?.length || 0;

        return JSON.stringify(stats);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : "Tool execution failed",
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY is not configured");

    // Get user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check if user has AI assistant access
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("ai_assistant_enabled")
      .eq("user_id", userId)
      .single();

    if (profileError || !profileData?.ai_assistant_enabled) {
      return new Response(
        JSON.stringify({ error: "forbidden", message: "ليس لديك صلاحية استخدام المساعد الذكي" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user roles for context
    const { data: userRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = (userRoles || []).map((r: any) => r.role);

    const { messages } = await req.json();

    // Get user's branch info for scope restriction
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("branch_id, full_name")
      .eq("user_id", userId)
      .single();

    const userBranchId = userProfile?.branch_id || null;
    const userName = userProfile?.full_name || "";

    // Build role-aware system prompt
    const roleContext = `
## معلومات المستخدم الحالي:
- الاسم: ${userName}
- الأدوار: ${roles.join(", ")}
- ${userBranchId ? `معرّف الفرع: ${userBranchId}` : "لا يوجد فرع محدد"}

## قواعد الصلاحيات (مهم جداً - يجب الالتزام بها):
${roles.includes("admin") || roles.includes("executive") ? "- هذا المستخدم لديه صلاحيات كاملة للاطلاع على جميع البيانات." : ""}
${roles.includes("branch_manager") ? `- هذا المستخدم مدير فرع. يمكنه فقط الاطلاع على بيانات فرعه (${userBranchId}). لا تعرض له أي بيانات من فروع أخرى. إذا طلب بيانات فروع أخرى، أخبره أن صلاحياته لا تسمح بذلك.` : ""}
${roles.includes("branch_employee") ? `- هذا المستخدم موظف فرع. يمكنه فقط الاطلاع على بيانات فرعه (${userBranchId}). لا تعرض له أي تقارير أو بيانات شاملة أو من فروع أخرى. إذا طلب ذلك، أخبره أن صلاحياته لا تسمح بذلك.` : ""}
${roles.includes("assessor") ? "- هذا المستخدم مقيّم جودة. يمكنه الاطلاع على التقييمات والملاحظات المرتبطة به فقط. لا تعرض له بيانات إدارية أو تقارير شاملة." : ""}
${roles.includes("support_agent") ? "- هذا المستخدم موظف دعم فني. يمكنه فقط الاطلاع على تذاكر الدعم. لا تعرض له تقييمات أو تقارير أداء الفروع." : ""}
- إذا طلب المستخدم بيانات خارج نطاق صلاحياته، أرفض الطلب بلطف وأوضح له السبب.
- البيانات المسترجعة من قاعدة البيانات محمية بنظام الصلاحيات (RLS) وستعود فقط البيانات المسموح بها.`;

    // First AI call with tools
    let aiMessages = [
      { role: "system", content: SYSTEM_PROMPT + roleContext },
      ...messages,
    ];

    let maxIterations = 5;
    let finalResponse: Response | null = null;

    while (maxIterations > 0) {
      maxIterations--;

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: aiMessages,
            tools,
            stream: false,
          }),
        }
      );

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "rate_limit", message: "تم تجاوز حد الطلبات، حاول بعد قليل" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "payment_required", message: "الرصيد غير كافٍ" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errText = await aiResponse.text();
        console.error("AI gateway error:", status, errText);
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      const assistantMessage = choice.message;

      // If the AI wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        aiMessages.push(assistantMessage);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          const result = await executeTool(
            supabaseClient,
            toolCall.function.name,
            args,
            userId
          );

          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          } as any);
        }

        // Continue loop for next AI call
        continue;
      }

      // No tool calls - return the final text response
      finalResponse = new Response(
        JSON.stringify({
          content: assistantMessage.content || "",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
      break;
    }

    if (!finalResponse) {
      finalResponse = new Response(
        JSON.stringify({ content: "عذراً، تعذر معالجة طلبك. حاول مرة أخرى." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return finalResponse;
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
