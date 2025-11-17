import newrelic from 'newrelic';

export function instrumentRequests(req, _res, next) {
  const name = `${req.method} ${req.route?.path || req.path}`;
  newrelic.setTransactionName(name);

  newrelic.addCustomAttributes({
    route: req.route?.path || req.path,
    method: req.method,
  });

  next();
}
