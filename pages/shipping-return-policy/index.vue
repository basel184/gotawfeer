<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
<main class="container py-5">
      <div class="row">
        <div class="col-12">
          <article class="card p-4 mb-4">
            <div>
            <h2 class="mb-3">{{ t('shipping_return.shipping.title') }}</h2>
            <p>{{ t('shipping_return.shipping.intro_1') }}</p>
            <p>{{ t('shipping_return.shipping.intro_2') }}</p>
            <ul>
              <li>{{ t('shipping_return.shipping.processing') }}</li>
              <li>{{ t('shipping_return.shipping.delivery_kingdom') }}</li>
              <li>{{ t('shipping_return.shipping.free_shipping') }}</li>
            </ul>
            <p>{{ t('shipping_return.shipping.note') }}</p>

            <h2 class="mb-3 mt-4">{{ t('shipping_return.return.title') }}</h2>
            <p><strong>{{ t('shipping_return.return.question') }}</strong></p>
            <p>{{ t('shipping_return.return.contact') }}</p>
            <p>{{ t('shipping_return.return.refund_period') }}</p>
            <ul>
              <li>{{ t('shipping_return.return.conditions.clarification') }}</li>
              <li>{{ t('shipping_return.return.conditions.damaged') }}</li>
              <li>{{ t('shipping_return.return.conditions.used') }}</li>
            </ul>

            <h3 class="mb-3">{{ t('shipping_return.return.non_returnable_title') }}</h3>
            <ul>
              <li>{{ t('shipping_return.return.non_returnable.care') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.cosmetics') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.perfumes') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.oud_wood') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.oud_oil') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.musk') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.scented_creams') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.scented_powder') }}</li>
              <li>{{ t('shipping_return.return.non_returnable.food') }}</li>
            </ul>

            <h2 class="mb-3 mt-4">{{ t('shipping_return.disclaimer.title') }}</h2>
            <p>{{ t('shipping_return.disclaimer.content') }}</p>

            <h2 class="mb-3 mt-4">{{ t('shipping_return.terms_conditions.title') }}</h2>
            <ul>
              <li>{{ t('shipping_return.terms_conditions.time_limit') }}</li>
              <li>{{ t('shipping_return.terms_conditions.packaging_difference') }}</li>
              <li>{{ t('shipping_return.terms_conditions.refund_time') }}</li>
            </ul>
            <p><strong>{{ t('shipping_return.terms_conditions.returnable_products') }}</strong></p>
            <ul>
              <li>{{ t('shipping_return.terms_conditions.damaged_product') }}</li>
              <li v-if="t('shipping_return.terms_conditions.cosmetics_return')">{{ t('shipping_return.terms_conditions.cosmetics_return') }}</li>
              <li>{{ t('shipping_return.terms_conditions.counterfeit_products') }}</li>
              <li>{{ t('shipping_return.terms_conditions.proof') }}</li>
              <li>{{ t('shipping_return.terms_conditions.processing') }}</li>
              <li>{{ t('shipping_return.terms_conditions.verify') }}</li>
              <li>{{ t('shipping_return.terms_conditions.return_fees') }}</li>
            </ul>
            <p>{{ t('shipping_return.terms_conditions.no_defect_note') }}</p>
            <p>{{ t('shipping_return.terms_conditions.shipping_fees') }}</p>
            <p><strong>{{ t('shipping_return.terms_conditions.faq_question') }}</strong></p>
            <p>{{ t('shipping_return.terms_conditions.faq_answer') }}</p>

            <h2 class="mb-3 mt-4">{{ t('shipping_return.warranty.title') }}</h2>
            <p>{{ t('shipping_return.warranty.sonata') }}</p>
            <p>{{ t('shipping_return.warranty.other_products') }}</p>
            <p>{{ t('shipping_return.warranty.defect_note') }}</p>

            <h2 class="mb-3 mt-4">{{ t('shipping_return.cancellation.title') }}</h2>
            <p>{{ t('shipping_return.cancellation.content_1') }}</p>
            <p>{{ t('shipping_return.cancellation.content_2') }}</p>
          </div>
          </article>
        </div>
      </div>
    </main>
</template>