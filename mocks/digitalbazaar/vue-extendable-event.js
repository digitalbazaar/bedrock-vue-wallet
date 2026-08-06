export default class ExtendableEvent {}
export const createEmitExtendable = ({emit}) =>
  (event, data) => emit(event, data);
