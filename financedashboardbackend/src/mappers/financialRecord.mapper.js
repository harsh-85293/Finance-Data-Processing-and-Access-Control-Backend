/**
 * Presentation mapping for financial records (single place for API shape).
 */

function toRecordJSON(doc) {
  return {
    id: doc.id,
    amount: doc.amount,
    type: doc.type,
    category: doc.category,
    date: doc.date,
    notes: doc.notes,
    createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = { toRecordJSON };
