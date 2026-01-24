<script setup lang="ts">
    import { useI18n } from 'vue-i18n'
    
    const { t } = useI18n()
    </script>
    
    <template>
        <main class="container py-5">
          <div class="row">
            <div class="col-12">
              <article class="card p-4 mb-4">
                <h2 class="section-title">{{ t('terms.bulk_orders.title') }}</h2>
                <hr>
                <p>
                    {{ t('terms.bulk_orders.content') }}
                </p>
                <div class="d-flex flex-wrap gap-3 mt-4">
                  <a 
                    href="https://wa.me/966537030838" 
                    target="_blank" 
                    class="btn btn-success d-flex align-items-center gap-2"
                    style="background-color: #25D366; border-color: #25D366;"
                  >
                    <i class="fa-brands fa-whatsapp"></i>
                    {{ t('terms.bulk_orders.whatsapp_button') }}
                  </a>
                  <a 
                    href="tel:+966537030838" 
                    class="btn btn-primary d-flex align-items-center gap-2"
                  >
                    <i class="fa-solid fa-phone"></i>
                    {{ t('terms.bulk_orders.contact_button') }}
                  </a>
                </div>
              </article>
            </div>
          </div>
        </main>
    </template>