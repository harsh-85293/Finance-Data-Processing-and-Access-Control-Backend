const { FinancialRecord } = require("../models/financialRecord");
const { ok, fail } = require("./httpResult");
const { getCachedSummaryPayload, setCachedSummaryPayload } = require("./dashboardCache");
const {
  parseOptionalDateRange,
  validateTrendGranularity,
  collectFieldErrors,
} = require("../utils/validation");

function formatRecent(doc) {
  return {
    id: String(doc._id),
    amount: doc.amount,
    type: doc.type,
    category: doc.category,
    date: doc.date,
    notes: doc.notes,
    createdAt: doc.createdAt,
  };
}

async function computeSummaryPayload(from, to, trend) {
  const match = { deletedAt: null };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const [agg] = await FinancialRecord.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: {
                  $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                },
              },
              totalExpense: {
                $sum: {
                  $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                },
              },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: "$category",
              income: {
                $sum: {
                  $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                },
              },
              expense: {
                $sum: {
                  $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
        recent: [
          { $sort: { date: -1 } },
          { $limit: 10 },
          {
            $project: {
              amount: 1,
              type: 1,
              category: 1,
              date: 1,
              notes: 1,
              createdAt: 1,
            },
          },
        ],
        monthlyTrend: [
          {
            $group: {
              _id: {
                y: { $year: "$date" },
                m: { $month: "$date" },
              },
              income: {
                $sum: {
                  $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                },
              },
              expense: {
                $sum: {
                  $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                },
              },
            },
          },
          { $sort: { "_id.y": 1, "_id.m": 1 } },
        ],
        weeklyTrend: [
          {
            $group: {
              _id: {
                y: { $isoWeekYear: "$date" },
                w: { $isoWeek: "$date" },
              },
              income: {
                $sum: {
                  $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                },
              },
              expense: {
                $sum: {
                  $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                },
              },
            },
          },
          { $sort: { "_id.y": 1, "_id.w": 1 } },
        ],
      },
    },
  ]);

  const totalsRow = agg.totals[0] || {};
  const totalIncome = totalsRow.totalIncome || 0;
  const totalExpense = totalsRow.totalExpense || 0;
  const netBalance = totalIncome - totalExpense;

  const categoryTotals = (agg.byCategory || []).map((row) => ({
    category: row._id,
    income: row.income || 0,
    expense: row.expense || 0,
    net: (row.income || 0) - (row.expense || 0),
  }));

  const recentActivity = (agg.recent || []).map(formatRecent);

  const monthlyBuckets = (agg.monthlyTrend || []).map((row) => ({
    period: "month",
    year: row._id.y,
    month: row._id.m,
    label: `${row._id.y}-${String(row._id.m).padStart(2, "0")}`,
    income: row.income || 0,
    expense: row.expense || 0,
    net: (row.income || 0) - (row.expense || 0),
  }));

  const weeklyBuckets = (agg.weeklyTrend || []).map((row) => ({
    period: "week",
    isoWeekYear: row._id.y,
    isoWeek: row._id.w,
    label: `${row._id.y}-W${String(row._id.w).padStart(2, "0")}`,
    income: row.income || 0,
    expense: row.expense || 0,
    net: (row.income || 0) - (row.expense || 0),
  }));

  const trends =
    trend === "week"
      ? { granularity: "week", buckets: weeklyBuckets }
      : { granularity: "month", buckets: monthlyBuckets };

  return {
    summary: {
      totalIncome,
      totalExpense,
      netBalance,
    },
    categoryTotals,
    recentActivity,
    trends,
    filters: {
      dateFrom: from || null,
      dateTo: to || null,
    },
  };
}

async function getSummary(query) {
  const rangeResult = parseOptionalDateRange(query.dateFrom, query.dateTo);
  const trendResult = validateTrendGranularity(query.trend);
  const errs = collectFieldErrors([rangeResult, trendResult]);
  if (errs) {
    return fail(400, { message: "Validation failed", details: errs });
  }

  const { from, to } = rangeResult.value;
  const trend = trendResult.value;

  const cached = await getCachedSummaryPayload(from, to, trend);
  if (cached) {
    return ok(cached);
  }

  const payload = await computeSummaryPayload(from, to, trend);
  await setCachedSummaryPayload(from, to, trend, payload);
  return ok(payload);
}

module.exports = { getSummary };
