import QualityOperatorList from "../QualityOperator/QualityOperatorList";

export default function PreQcOperatorList() {
  return (
    <QualityOperatorList
      statusFilter="PRE_QC"
      title="Pre-QC"
      basePath="/pre-qc/operator"
    />
  );
}
