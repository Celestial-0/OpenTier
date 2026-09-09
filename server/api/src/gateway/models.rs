use axum::{
    Router,
    extract::{Query, State},
    middleware,
    response::IntoResponse,
    routing::{get, patch, post},
};

use crate::catalog::{self, CatalogError};
use crate::gateway::AppState;

#[derive(Debug, serde::Deserialize, Default)]
pub struct ListModelsQuery {
    pub all: Option<bool>,
}

pub async fn list_models(
    state: State<AppState>,
    Query(query): Query<ListModelsQuery>,
) -> Result<axum::response::Response, CatalogError> {
    if query.all.unwrap_or(false) {
        let res = catalog::list_all_models(state).await?;
        Ok(res.into_response())
    } else {
        let res = catalog::list_chat_models(state).await?;
        Ok(res.into_response())
    }
}

pub fn routes(state: AppState) -> Router<AppState> {
    let auth_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::auth_middleware);
    let admin_mw = middleware::from_fn_with_state(state.clone(), crate::middleware::require_admin);

    let admin_routes = Router::new()
        .route("/", post(catalog::create_model))
        .route(
            "/{id}",
            patch(catalog::update_model).delete(catalog::delete_model),
        )
        .route("/reindex", post(catalog::reindex_all_documents))
        .route("/reembed", post(catalog::reindex_all_documents))
        .layer(admin_mw)
        .layer(auth_mw);

    Router::new()
        .route("/", get(list_models))
        .merge(admin_routes)
}
